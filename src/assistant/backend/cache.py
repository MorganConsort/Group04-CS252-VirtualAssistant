"""Small, bounded progress cache; no cross-user keys or persisted credentials."""

from collections import OrderedDict
from threading import Lock
from time import monotonic


class ReportCache:
    def __init__(self, ttl_seconds=10, max_entries=128):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._items = OrderedDict()
        self._lock = Lock()
        self._generation = 0

    @property
    def generation(self):
        with self._lock:
            return self._generation

    def get(self, key):
        with self._lock:
            item = self._items.get(key)
            if item is None:
                return None
            expires, value = item
            if expires <= monotonic():
                del self._items[key]
                return None
            self._items.move_to_end(key)
            return value.model_copy(deep=True)

    def put(self, key, value, generation):
        with self._lock:
            if generation != self._generation:
                return  # A concurrent commit invalidated the query while it ran.
            self._items[key] = (
                monotonic() + self.ttl_seconds,
                value.model_copy(deep=True),
            )
            self._items.move_to_end(key)
            while len(self._items) > self.max_entries:
                self._items.popitem(last=False)

    def clear(self):
        with self._lock:
            self._generation += 1
            self._items.clear()
