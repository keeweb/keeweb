cmake_minimum_required(VERSION 3.7)

project(keeweb-native-messaging-host)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

FetchContent_Declare(
    libuv
    GIT_REPOSITORY https://github.com/libuv/libuv.git
    GIT_TAG        v1.41.0
)

FetchContent_MakeAvailable(libuv)

set(OUTPUT_NAME ${PROJECT_NAME})
set(SOURCES src/native-messaging-host.cpp)

add_executable(${PROJECT_NAME} ${SOURCES})

target_link_libraries(${PROJECT_NAME} PRIVATE uv_a)
target_include_directories(${PROJECT_NAME} PRIVATE ${libuv_SOURCE_DIR}/include)
if(WIN32)
    target_compile_options(${PROJECT_NAME} PRIVATE /W4 /WX /permissive-)
else()
    target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra -pedantic -Werror)
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(${PROJECT_NAME} PRIVATE -fsanitize=address,undefined)
    target_link_options(${PROJECT_NAME} PRIVATE -fsanitize=address,undefined)
endif()
