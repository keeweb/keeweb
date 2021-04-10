#include <stdio.h>
#include <uv.h>

#include <algorithm>
#include <array>
#include <filesystem>
#include <iostream>
#include <queue>
#include <vector>

// https://developer.chrome.com/docs/apps/nativeMessaging/#native-messaging-host-protocol
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging#app_side

#if defined(WIN32) || defined(_WIN32) || defined(__WIN32)
#define APP_EXECUTABLE_FILE_NAME "KeeWeb.exe"
#elif __APPLE__
#define APP_EXECUTABLE_FILE_NAME "KeeWeb"
#else
#define APP_EXECUTABLE_FILE_NAME "keeweb"
#endif

constexpr auto kKeeWebLaunchArg = "--browser-extension";

constexpr auto kSockName = "keeweb-browser.sock";

constexpr std::array kAllowedOrigins = {
    std::string_view("chrome-extension://enjifmdnhaddmajefhfaoglcfdobkcpj/")};

constexpr uint32_t kMaxKeeWebConnectAttempts = 10;
constexpr uint32_t kMaxKeeWebConnectRetryTimeoutMillis = 500;

struct State {
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

bool check_args(int argc, char *argv[]) {
    if (argc < 2) {
        return false;
    }

    std::string origin = argv[1];
    auto found = std::find(kAllowedOrigins.begin(), kAllowedOrigins.end(), origin);
    if (found == kAllowedOrigins.end()) {
        return false;
    }

    return true;
}

void alloc_buf(uv_handle_t *, size_t size, uv_buf_t *buf) {
    buf->base = new char[size];
    buf->len = size;
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
            uv_buf_t{.base = buf->base, .len = static_cast<size_t>(nread)});
        process_keeweb_queue();
    } else if (nread < 0) {
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
            uv_buf_t{.base = buf->base, .len = static_cast<size_t>(nread)});
        process_stdout_queue();
    } else if (nread < 0) {
        close_keeweb_pipe();
    }
}

void keeweb_connect_timer_cb(uv_timer_t *timer) {
    delete timer;
    connect_keeweb_pipe();
}

void set_keeweb_connect_timer() {
    auto timer_req = new uv_timer_t();
    uv_timer_init(uv_default_loop(), timer_req);
    uv_timer_start(timer_req, keeweb_connect_timer_cb, kMaxKeeWebConnectRetryTimeoutMillis, 0);
}

void keeweb_pipe_connect_cb(uv_connect_t *req, int status) {
    auto pipe = req->handle;
    delete req;
    auto connected = status >= 0;
    if (connected) {
        state.keeweb_pipe = pipe;
        uv_read_start(pipe, alloc_buf, keeweb_pipe_read_cb);
        process_keeweb_queue();
    } else if (state.keeweb_launched) {
        if (state.keeweb_connect_attempts >= kMaxKeeWebConnectAttempts) {
            quit_on_error();
        } else {
            set_keeweb_connect_timer();
        }
    } else {
        auto child_req = new uv_process_t();
        const char *args[2]{kKeeWebLaunchArg, nullptr};
        uv_process_options_t options{.file = APP_EXECUTABLE_FILE_NAME,
                                     .args = const_cast<char **>(args),
                                     .flags = UV_PROCESS_DETACHED};
        auto spawn_error = uv_spawn(uv_default_loop(), child_req, &options);
        if (spawn_error) {
            quit_on_error();
        } else {
            uv_unref(reinterpret_cast<uv_handle_t *>(&child_req));
            state.keeweb_launched = true;
            set_keeweb_connect_timer();
        }
    }
}

void connect_keeweb_pipe() {
    state.keeweb_connect_attempts++;

    auto temp_path = std::filesystem::temp_directory_path();
    auto keeweb_pipe_path = temp_path / kSockName;
    auto keeweb_pipe_name = keeweb_pipe_path.c_str();

    auto keeweb_pipe = new uv_pipe_t{};
    uv_pipe_init(uv_default_loop(), keeweb_pipe, false);

    auto connect_req = new uv_connect_t();
    uv_pipe_connect(connect_req, keeweb_pipe, keeweb_pipe_name, keeweb_pipe_connect_cb);
}

void start_reading_stdin() { uv_read_start(state.tty_in, alloc_buf, stdin_read_cb); }

void init_tty() {
    auto stdin_tty = new uv_tty_t{};
    uv_tty_init(uv_default_loop(), stdin_tty, fileno(stdin), 0);
    state.tty_in = reinterpret_cast<uv_stream_t *>(stdin_tty);

    auto stdout_tty = new uv_tty_t{};
    uv_tty_init(uv_default_loop(), stdout_tty, fileno(stdout), 0);
    state.tty_out = reinterpret_cast<uv_stream_t *>(stdout_tty);
}

int main(int argc, char *argv[]) {
    if (!check_args(argc, argv)) {
        return 1;
    }

    init_tty();
    start_reading_stdin();
    connect_keeweb_pipe();

    uv_run(uv_default_loop(), UV_RUN_DEFAULT);
}
