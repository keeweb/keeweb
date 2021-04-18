#include <uv.h>

#include <algorithm>
#include <filesystem>
#include <iostream>
#include <queue>
#include <string>
#include <string_view>
#include <vector>

// https://developer.chrome.com/docs/apps/nativeMessaging/#native-messaging-host-protocol
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#app_side

struct State {
    std::string origin;
    uv_stream_t *tty_in = nullptr;
    uv_stream_t *tty_out = nullptr;
    uv_stream_t *keeweb_pipe = nullptr;
    std::queue<uv_buf_t> pending_to_keeweb{};
    std::queue<uv_buf_t> pending_to_stdout{};
    bool write_to_keeweb_in_progress = false;
    bool write_to_stdout_in_progress = false;
    bool keeweb_launched = false;
    uint32_t keeweb_connect_attempts = 0;
};

State state{};

void process_keeweb_queue();
void process_stdout_queue();
void close_keeweb_pipe();
void connect_keeweb_pipe();

void alloc_buf(uv_handle_t *, size_t size, uv_buf_t *buf) {
    buf->base = new char[size];
    buf->len = static_cast<decltype(uv_buf_t::len)>(size);
}

void quit_on_error() {
    if (state.keeweb_pipe) {
        close_keeweb_pipe();
    } else {
        uv_read_stop(state.tty_in);
        uv_loop_close(uv_default_loop());
    }
}

void stdin_read_cb(uv_stream_t *, ssize_t nread, const uv_buf_t *buf) {
    if (nread > 0) {
        state.pending_to_keeweb.emplace(
            uv_buf_init(buf->base, static_cast<decltype(uv_buf_t::len)>(nread)));
        process_keeweb_queue();
    } else if (nread == UV_EOF) {
        quit_on_error();
    } else if (nread < 0) {
        std::cerr << "STDIN read error: " << uv_err_name(static_cast<int>(nread)) << std::endl;
        quit_on_error();
    }
}

void stdout_write_cb(uv_write_t *req, int status) {
    delete req;

    auto buf = state.pending_to_stdout.front();
    state.pending_to_stdout.pop();
    delete[] buf.base;

    state.write_to_stdout_in_progress = false;

    auto success = status >= 0;
    if (success) {
        process_stdout_queue();
    } else {
        std::cerr << "STDOUT write error: " << uv_err_name(status) << std::endl;
        quit_on_error();
    }
}

void process_stdout_queue() {
    if (state.write_to_stdout_in_progress || state.pending_to_stdout.empty()) {
        return;
    }
    auto buf = state.pending_to_stdout.front();

    auto write_req = new uv_write_t{};
    uv_write(write_req, state.tty_out, &buf, 1, stdout_write_cb);

    state.write_to_stdout_in_progress = true;
}

void keeweb_pipe_close_cb(uv_handle_t *pipe) {
    delete pipe;
    uv_read_stop(state.tty_in);
    uv_loop_close(uv_default_loop());
}

void close_keeweb_pipe() {
    if (!state.keeweb_pipe) {
        return;
    }
    auto pipe = state.keeweb_pipe;
    state.keeweb_pipe = nullptr;
    uv_read_stop(pipe);
    uv_close(reinterpret_cast<uv_handle_t *>(pipe), keeweb_pipe_close_cb);
}

void keeweb_write_cb(uv_write_t *req, int status) {
    delete req;

    auto buf = state.pending_to_keeweb.front();
    state.pending_to_keeweb.pop();
    delete[] buf.base;

    state.write_to_keeweb_in_progress = false;

    auto success = status >= 0;
    if (success) {
        process_keeweb_queue();
    } else {
        std::cerr << "Error writing to KeeWeb: " << uv_err_name(status) << std::endl;
        close_keeweb_pipe();
    }
}

void process_keeweb_queue() {
    if (!state.keeweb_pipe || state.write_to_keeweb_in_progress ||
        state.pending_to_keeweb.empty()) {
        return;
    }
    auto buf = state.pending_to_keeweb.front();

    auto write_req = new uv_write_t{};
    uv_write(write_req, state.keeweb_pipe, &buf, 1, keeweb_write_cb);

    state.write_to_keeweb_in_progress = true;
}

void keeweb_pipe_read_cb(uv_stream_t *, ssize_t nread, const uv_buf_t *buf) {
    if (nread > 0) {
        state.pending_to_stdout.emplace(
            uv_buf_init(buf->base, static_cast<decltype(uv_buf_t::len)>(nread)));
        process_stdout_queue();
    } else if (nread == UV_EOF) {
        close_keeweb_pipe();
    } else if (nread < 0) {
        std::cerr << "KeeWeb read error: " << uv_err_name(static_cast<int>(nread)) << std::endl;
        close_keeweb_pipe();
    }
}

void keeweb_pipe_connect_cb(uv_connect_t *req, int status) {
    auto pipe = req->handle;
    delete req;
    auto connected = status >= 0;
    if (connected) {
        state.keeweb_pipe = pipe;
        uv_read_start(pipe, alloc_buf, keeweb_pipe_read_cb);
        process_keeweb_queue();
    } else {
        std::cerr << "Cannot connect to KeeWeb: " << uv_err_name(status) << std::endl;
        quit_on_error();
    }
}

std::string keeweb_pipe_name() {
    std::string pipe_name;

    uv_passwd_t user_info;
    auto err = uv_os_get_passwd(&user_info);

    if (err) {
        std::cerr << "Error getting user info: " << uv_err_name(err) << std::endl;
    } else {
#if defined(WIN32) || defined(_WIN32) || defined(__WIN32)
        pipe_name = "\\\\.\\pipe\\keeweb-connect-" + std::string{user_info.username};
#elif __APPLE__
        pipe_name = "/Users/" + std::string{user_info.username} +
                    "/Library/Group Containers/3LE7JZ657W.keeweb/conn.sock";
#else
        pipe_name = std::filesystem::temp_directory_path() /
                    ("keeweb-connect-" + std::to_string(user_info.uid) + ".sock");
#endif
        uv_os_free_passwd(&user_info);
    }

    return pipe_name;
}

void connect_keeweb_pipe() {
    state.keeweb_connect_attempts++;

    auto pipe_name = keeweb_pipe_name();
    if (pipe_name.empty()) {
        quit_on_error();
        return;
    }

    auto keeweb_pipe = new uv_pipe_t{};
    uv_pipe_init(uv_default_loop(), keeweb_pipe, false);

    auto connect_req = new uv_connect_t();
    uv_pipe_connect(connect_req, keeweb_pipe, pipe_name.c_str(), keeweb_pipe_connect_cb);
}

void start_reading_stdin() { uv_read_start(state.tty_in, alloc_buf, stdin_read_cb); }

void push_first_message_to_keeweb() {
    auto origin = state.origin;
    std::replace(origin.begin(), origin.end(), '"', '\'');

    auto message = "{\"pid\":" + std::to_string(uv_os_getpid()) +
                   ",\"ppid\":" + std::to_string(uv_os_getppid()) + ",\"origin\":\"" + origin +
                   "\"}";

    auto message_length = message.length() + sizeof(uint32_t);
    auto data = new char[message_length];
    auto size_ptr = reinterpret_cast<uint32_t *>(data);

    *size_ptr = message.length();
    memcpy(data + sizeof(uint32_t), message.c_str(), message.length());

    state.pending_to_keeweb.emplace(
        uv_buf_init(data, static_cast<decltype(uv_buf_t::len)>(message_length)));
}

void init_tty() {
    auto stdin_tty = new uv_tty_t{};
    uv_tty_init(uv_default_loop(), stdin_tty, 0, 0);
    state.tty_in = reinterpret_cast<uv_stream_t *>(stdin_tty);

    auto stdout_tty = new uv_tty_t{};
    uv_tty_init(uv_default_loop(), stdout_tty, 1, 0);
    state.tty_out = reinterpret_cast<uv_stream_t *>(stdout_tty);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        std::cerr << "Expected origin argument" << std::endl;
        return 1;
    }
    state.origin = argv[1];

    push_first_message_to_keeweb();

    init_tty();
    start_reading_stdin();
    connect_keeweb_pipe();

    uv_run(uv_default_loop(), UV_RUN_DEFAULT);
}
