import os
from redis import Redis
from rq import Worker, SimpleWorker
from .db import initialize

if __name__ == "__main__":
    initialize()
    connection=Redis.from_url(os.environ.get("REDIS_URL","redis://localhost:6379/0"))
    cls=SimpleWorker if os.name=="nt" else Worker
    cls(["renders"],connection=connection).work()
