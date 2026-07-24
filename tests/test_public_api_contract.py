from media_player_app.api_routes import ApiRoutesMixin
from media_player_app.media_models import Interview, Track, Video


class Routes(ApiRoutesMixin):
    pass


def test_public_track_hides_paths_and_exposes_explicit_order():
    track = Track(
        id=1,
        path="Artist/Album/2-03 - Song.flac",
        filename="2-03 - Song.flac",
        format="flac",
        title="Song",
        artist="Artist",
        album="Album",
        albumartist="Artist",
        date="2024",
        tracknumber="",
        genre="",
        has_artwork=False,
        artwork_url="",
        audio_url="/audio/1",
        size_mb=10,
        folder="Artist/Album",
        has_lyrics=False,
        lyrics_url="",
        lyrics_format="",
    )

    public = Routes().public_track(track)

    assert "path" not in public
    assert "filename" not in public
    assert public["sort_disc"] == 2
    assert public["sort_track"] == 3
    assert public["playback_key"]


def test_public_video_hides_paths_and_exposes_year():
    video = Video(
        id=2,
        path="Concerts/(2023) Show/01 Opening.mp4",
        filename="01 Opening.mp4",
        title="01 Opening",
        folder="Concerts/(2023) Show",
        category="Concerts",
        format="mp4",
        size_mb=20,
        video_url="/video/2",
        thumbnail_url="",
        has_thumbnail=False,
        folder_cover_url="",
        has_folder_cover=False,
        browser_friendly=True,
    )

    public = Routes().public_video(video)

    assert "path" not in public
    assert "filename" not in public
    assert public["year"] == 2023
    assert public["playback_key"]


def test_public_interview_hides_paths_and_exposes_stable_selection_key():
    interview = Interview(
        id=3,
        path="2024/Example.txt",
        filename="Example.txt",
        title="2024 Example",
        year="2024",
        source="Example",
        content="Text",
    )

    public = Routes().public_interview(interview)

    assert "path" not in public
    assert "filename" not in public
    assert public["selection_key"] == Routes.playback_key(interview.path)
