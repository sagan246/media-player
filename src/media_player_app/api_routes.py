"""Read APIs plus playlist and listening-state routes."""

from __future__ import annotations

import hashlib
from dataclasses import asdict
from http import HTTPStatus
from urllib.parse import parse_qs, unquote

from .playlist_store import PlaylistError
from .server_config import ART_THUMB_ICON_SIZE


class ApiRoutesMixin:
    """JSON APIs that do not write metadata into media files."""

    def handle_tracks_api(self) -> None:
        with self.library.lock:
            tracks = [
                self.public_track(track)
                for track in self.library.tracks
                if self.player_config.allows_album(track.album)
            ]
        self.send_json({"tracks": tracks, "total": len(tracks)})

    def handle_videos_api(self) -> None:
        with self.library.lock:
            videos = (
                []
                if self.player_config.guest_mode
                else [self.public_video(video) for video in self.library.videos]
            )
        self.send_json({"videos": videos, "total": len(videos)})

    def handle_interviews_api(self) -> None:
        with self.library.lock:
            interviews = (
                []
                if self.player_config.guest_mode
                else [self.public_interview(interview) for interview in self.library.interviews]
            )
        self.send_json({"interviews": interviews, "total": len(interviews)})

    def handle_playlists_api(self) -> None:
        playlists = [] if self.player_config.guest_mode else self.playlist_store.list_for_library(self.library)
        self.send_json({"playlists": playlists, "total": len(playlists)})

    def handle_listening_stats_api(self, query_text: str) -> None:
        query = parse_qs(query_text)
        period = query.get("period", ["week"])[0]
        start = query.get("start", [None])[0]
        end = query.get("end", [None])[0]
        self.send_json(self.listening_stats.summary(period, start, end))

    def handle_game_score_api(self) -> None:
        """Return the shared high score for the human game mode."""
        self.send_json({"best_score": self.game_stats.best_score()})

    def handle_config_api(self) -> None:
        self.send_json(
            {
                "playlistEditable": self.playlist_editable,
                "webShare": self.web_share,
                "appName": self.player_config.app_name,
                "textTabLabel": self.player_config.text_tab_label,
                "textDir": self.player_config.text_dir,
                "preferredCategories": self.player_config.preferred_categories,
                "preferredVideoCategories": self.player_config.preferred_video_categories,
                "gameAvailable": self.game_dir is not None,
                "guestMode": self.player_config.guest_mode,
                "guestAlbum": self.player_config.guest_album if self.player_config.guest_mode else "",
            }
        )

    def handle_refresh_api(self) -> None:
        self.library.refresh()
        if self.player_config.guest_mode:
            with self.library.lock:
                available = any(self.player_config.allows_album(track.album) for track in self.library.tracks)
            if not available:
                self.send_error_json("The configured Guest Mode album is no longer available.", status=HTTPStatus.CONFLICT)
                return
        self.send_ok()

    def public_track(self, track: object) -> dict[str, object]:
        data = asdict(track)
        data["playback_key"] = self.playback_key(str(data.get("path", "")))
        thumb_url = self.art_thumbnail_url(str(data.get("artwork_url", "")))
        data["artwork_thumb_url"] = thumb_url
        data["artwork_thumb_small_url"] = self.add_query_param(thumb_url, "s", str(ART_THUMB_ICON_SIZE))
        if self.web_share:
            data["path"] = ""
            data["filename"] = ""
        return data

    @staticmethod
    def art_thumbnail_url(artwork_url: str) -> str:
        return artwork_url.replace("/art/", "/art-thumb/", 1) if artwork_url else ""

    @staticmethod
    def add_query_param(url: str, key: str, value: str) -> str:
        if not url:
            return ""
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}{key}={value}"

    def public_video(self, video: object) -> dict[str, object]:
        data = asdict(video)
        data["playback_key"] = self.playback_key(str(data.get("path", "")))
        if self.web_share:
            data["path"] = ""
            data["filename"] = ""
        return data

    @staticmethod
    def playback_key(relative_path: str) -> str:
        """Return a path-stable identifier without exposing the path itself."""
        normalized = relative_path.replace("\\", "/")
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:24]

    def public_interview(self, interview: object) -> dict[str, object]:
        data = asdict(interview)
        if self.web_share:
            data["path"] = ""
            data["filename"] = ""
        return data

    def require_playlist_access(self) -> bool:
        if not self.playlist_editable:
            self.send_error_json("Playlist changes are disabled for this server.", status=HTTPStatus.FORBIDDEN)
            return False
        return True

    def handle_playlist_create(self) -> None:
        payload = self.read_json_object()
        if payload is None:
            return
        try:
            record = self.playlist_store.create(payload.get("name"), payload.get("track_ids"), self.library)
            self.send_ok(id=record["id"], name=record["name"])
        except PlaylistError as exc:
            self.send_error_json(str(exc))

    def handle_playlist_update(self, path_text: str) -> None:
        payload = self.read_json_object()
        if payload is None:
            return
        try:
            playlist_id = unquote(path_text.rsplit("/", 1)[-1])
            if "track_ids" in payload:
                record = self.playlist_store.replace_tracks(playlist_id, payload.get("track_ids"), self.library)
            elif "name" in payload:
                record = self.playlist_store.rename(playlist_id, payload.get("name"))
            else:
                raise PlaylistError("No playlist changes were provided.")
            self.send_ok(id=record["id"], name=record["name"])
        except PlaylistError as exc:
            self.send_error_json(str(exc))

    def handle_playlist_resume(self, path_text: str) -> None:
        payload = self.read_json_object()
        if payload is None:
            return
        try:
            playlist_id = unquote(path_text.removesuffix("/resume").rsplit("/", 1)[-1])
            self.playlist_store.set_resume(playlist_id, payload.get("track_id"), self.library)
            self.send_ok()
        except PlaylistError as exc:
            self.send_error_json(str(exc))

    def handle_playlist_delete(self, path_text: str) -> None:
        try:
            self.playlist_store.delete(unquote(path_text.rsplit("/", 1)[-1]))
            self.send_ok()
        except PlaylistError as exc:
            self.send_error_json(str(exc), status=HTTPStatus.NOT_FOUND)

    def handle_listening_stats_record(self) -> None:
        try:
            payload = self.read_json_object()
            if payload is None:
                return
            # Guest sessions are intentionally disposable and must never alter
            # the owner's listening history, even from an older cached client.
            if self.player_config.guest_mode:
                self.send_json({"ok": True, "ignored": True, "reason": "guest_mode"})
                return
            self.send_json(self.listening_stats.record(payload))
        except Exception as exc:  # noqa: BLE001 - stats failures should be visible to the client.
            self.send_error_json(str(exc), status=HTTPStatus.INTERNAL_SERVER_ERROR)

    def handle_game_score_record(self) -> None:
        """Accept a bounded human-game score, including from Guest Mode."""
        payload = self.read_json_object()
        if payload is None:
            return
        try:
            best_score = self.game_stats.record(payload.get("score"))
        except ValueError as exc:
            self.send_error_json(str(exc))
            return
        self.send_json({"ok": True, "best_score": best_score})
