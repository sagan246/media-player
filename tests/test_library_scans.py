from media_player_app.library_text import clean_interview_title, scan_interviews
from media_player_app.library_video import scan_videos


def test_video_scan_discovers_thumbnail_and_folder_cover(tmp_path):
    video_dir = tmp_path / "Video"
    album_dir = video_dir / "Concerts" / "Show"
    album_dir.mkdir(parents=True)
    video_path = album_dir / "Opening.mp4"
    video_path.write_bytes(b"video")
    video_path.with_suffix(".jpg").write_bytes(b"thumb")
    (album_dir / "cover.png").write_bytes(b"cover")

    videos, paths, thumbnails, folder_covers = scan_videos(video_dir)

    assert paths == [video_path]
    assert videos[0].browser_friendly is True
    assert videos[0].category == "Concerts"
    assert videos[0].folder == "Concerts/Show"
    assert thumbnails[videos[0].id] == video_path.with_suffix(".jpg")
    assert folder_covers["Concerts/Show"] == album_dir / "cover.png"


def test_text_scan_handles_missing_folder(tmp_path):
    assert scan_interviews(tmp_path / "missing") == []


def test_text_title_cleanup_removes_compact_credit():
    assert clean_interview_title("2024 Elle 309KTYSS") == "2024 Elle"
