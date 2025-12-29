-- enum (선택: 그냥 TEXT로 해도 됨)
DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM ('baseball', 'volleyball');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE visibility_type AS ENUM ('private', 'public');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- users (게스트 닉네임 기반)
CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL PRIMARY KEY,
  nickname     VARCHAR(30) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- favorites (종목별 응원팀 1개씩 저장)
CREATE TABLE IF NOT EXISTS favorites (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport        sport_type NOT NULL,
  gender       VARCHAR(10) NOT NULL DEFAULT 'none', -- baseball이면 'none', volleyball이면 'male'/'female'/'none'
  team_code    VARCHAR(30) NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sport, gender)
);

-- diaries
CREATE TABLE IF NOT EXISTS diaries (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport        sport_type NOT NULL,

  -- 팀 (야구: home/away 사용, 배구: 남/여 선택 로직에 맞춰 team_home만 써도 됨)
  team_home    VARCHAR(30) NOT NULL,
  team_away    VARCHAR(30),

  game_date    DATE NOT NULL,

  venue_name   VARCHAR(100) NOT NULL, -- 장소 텍스트

  one_liner    VARCHAR(120) NOT NULL,

  visibility   visibility_type NOT NULL DEFAULT 'private',

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diaries_user_created
ON diaries(user_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_diaries_visibility_created
ON diaries(visibility, created_at DESC);

-- photos (1~3장)
CREATE TABLE IF NOT EXISTS diary_photos (
  id           BIGSERIAL PRIMARY KEY,
  diary_id     BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- likes
CREATE TABLE IF NOT EXISTS likes (
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diary_id     BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, diary_id)
);


-- comments
CREATE TABLE IF NOT EXISTS comments (
  id           BIGSERIAL PRIMARY KEY,
  diary_id     BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      VARCHAR(300) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);