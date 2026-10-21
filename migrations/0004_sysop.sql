-- Only server-authenticated staff posts receive the official diamond.
ALTER TABLE posts ADD COLUMN staff_verified INTEGER NOT NULL DEFAULT 0 CHECK(staff_verified IN (0,1));
