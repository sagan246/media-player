from http import HTTPStatus

import pytest

from media_player_app.media_player import parse_range_header
from media_player_app.streaming import StreamingRoutesMixin


@pytest.mark.parametrize(
    ("header", "size", "expected"),
    [
        (None, 100, (HTTPStatus.OK, 0, 99)),
        ("bytes=10-19", 100, (HTTPStatus.PARTIAL_CONTENT, 10, 19)),
        ("bytes=90-", 100, (HTTPStatus.PARTIAL_CONTENT, 90, 99)),
        ("bytes=-12", 100, (HTTPStatus.PARTIAL_CONTENT, 88, 99)),
        ("bytes=10-999", 100, (HTTPStatus.PARTIAL_CONTENT, 10, 99)),
    ],
)
def test_parse_range_header(header, size, expected):
    assert parse_range_header(header, size) == expected


@pytest.mark.parametrize("header", ["items=0-1", "bytes=", "bytes=a-b", "bytes=100-101", "bytes=-0"])
def test_parse_range_header_rejects_invalid_ranges(header):
    with pytest.raises(ValueError):
        parse_range_header(header, 100)


def test_parse_range_header_rejects_empty_files():
    with pytest.raises(ValueError):
        parse_range_header(None, 0)


class HeaderRecorder(StreamingRoutesMixin):
    def __init__(self, range_header=None, command="GET"):
        self.headers = {"Range": range_header} if range_header else {}
        self.command = command
        self.status = None
        self.response_headers = {}
        self.wfile = None
        self.error_status = None

    def send_response(self, status):
        self.status = status

    def send_header(self, name, value):
        self.response_headers[name] = value

    def end_headers(self):
        pass

    def send_error(self, status):
        self.error_status = status

    def log_message(self, *_args):
        pass


def test_unsatisfied_range_returns_required_content_range(tmp_path):
    media = tmp_path / "sample.flac"
    media.write_bytes(b"0123456789")
    handler = HeaderRecorder("bytes=20-30")

    handler.stream_file(media, "test")

    assert handler.status == HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE
    assert handler.response_headers["Content-Range"] == "bytes */10"
    assert handler.response_headers["Accept-Ranges"] == "bytes"
    assert handler.response_headers["Content-Length"] == "0"


def test_head_range_returns_headers_without_opening_response_stream(tmp_path):
    media = tmp_path / "sample.flac"
    media.write_bytes(b"0123456789")
    handler = HeaderRecorder("bytes=2-5", command="HEAD")

    handler.stream_file(media, "test")

    assert handler.status == HTTPStatus.PARTIAL_CONTENT
    assert handler.response_headers["Content-Range"] == "bytes 2-5/10"
    assert handler.response_headers["Content-Length"] == "4"


def test_full_response_has_streaming_headers_and_body(tmp_path):
    media = tmp_path / "sample.mp3"
    media.write_bytes(b"0123456789")
    handler = HeaderRecorder()
    handler.wfile = RecordingWriter()

    handler.stream_file(media, "test")

    assert handler.status == HTTPStatus.OK
    assert handler.response_headers["Content-Type"] == "audio/mpeg"
    assert handler.response_headers["Accept-Ranges"] == "bytes"
    assert handler.response_headers["Content-Length"] == "10"
    assert "Content-Range" not in handler.response_headers
    assert bytes(handler.wfile.body) == b"0123456789"


def test_partial_response_writes_only_the_requested_bytes(tmp_path):
    media = tmp_path / "sample.flac"
    media.write_bytes(b"0123456789")
    handler = HeaderRecorder("bytes=3-6")
    handler.wfile = RecordingWriter()

    handler.stream_file(media, "test")

    assert handler.status == HTTPStatus.PARTIAL_CONTENT
    assert handler.response_headers["Content-Type"] == "audio/flac"
    assert handler.response_headers["Content-Range"] == "bytes 3-6/10"
    assert bytes(handler.wfile.body) == b"3456"


def test_missing_file_returns_not_found(tmp_path):
    handler = HeaderRecorder()

    handler.stream_file(tmp_path / "missing.flac", "test")

    assert handler.error_status == HTTPStatus.NOT_FOUND


def test_interrupted_client_does_not_escape_stream_loop(tmp_path):
    media = tmp_path / "sample.flac"
    media.write_bytes(b"x" * (300 * 1024))
    handler = HeaderRecorder()
    handler.wfile = DisconnectingWriter()

    handler.stream_file(media, "test")

    assert handler.status == HTTPStatus.OK
    assert handler.wfile.write_calls == 2


class RecordingWriter:
    def __init__(self):
        self.body = bytearray()

    def write(self, chunk):
        self.body.extend(chunk)


class DisconnectingWriter:
    def __init__(self):
        self.write_calls = 0

    def write(self, _chunk):
        self.write_calls += 1
        if self.write_calls == 2:
            raise ConnectionResetError
