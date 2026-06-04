-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- machines (seeded with FlyeFit gym machines)
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('upper', 'lower', 'core', 'cardio')),
  brand TEXT,
  description TEXT,
  video_url TEXT
);

-- routines
-- assigned_weekdays: 0 = Sunday, 6 = Saturday (matches JS Date.getDay()).
-- Uniqueness within array enforced at the API layer (Postgres disallows
-- subqueries in CHECK constraints).
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  notes TEXT,
  assigned_weekdays SMALLINT[] NOT NULL DEFAULT '{}'::SMALLINT[]
    CHECK (assigned_weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- routine_items (machines in a routine)
CREATE TABLE routine_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id),
  position INTEGER NOT NULL,
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 10,
  rest_seconds INTEGER DEFAULT 60,
  default_weight NUMERIC
);

-- workout_sessions
-- routine_id ON DELETE SET NULL: history persists when the routine is deleted.
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- workout_sets (actual recorded weights)
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  routine_item_id UUID REFERENCES routine_items(id),
  set_number INTEGER NOT NULL,
  target_reps INTEGER NOT NULL,
  actual_reps INTEGER,
  weight NUMERIC NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_routine_items_routine_id ON routine_items(routine_id);
CREATE INDEX idx_routine_items_position ON routine_items(routine_id, position);
CREATE INDEX idx_workout_sessions_routine_id ON workout_sessions(routine_id);
CREATE INDEX idx_workout_sets_session_id ON workout_sets(session_id);

-- Seed machines data (FlyeFit gym machines)
INSERT INTO machines (name, category, brand, description, video_url) VALUES
  ('Treadmill', 'cardio', 'Life Fitness', 'Motorized belt for walking, jogging, and running with adjustable speed and incline.', 'https://www.youtube.com/watch?v=8iPEnn-ltC8'),
  ('Stairmaster', 'cardio', 'Shua', 'Revolving staircase simulator that builds lower-body endurance and cardiovascular fitness.', 'https://www.youtube.com/watch?v=VCIe9LOh5eY'),
  ('Glutes and Hamstring Developer', 'lower', 'Exigo', 'Targets the glutes and hamstrings through a hip extension movement on a padded bench.', 'https://www.youtube.com/watch?v=B2uoBJJETkI'),
  ('Smith Machine', 'upper', 'Exigo', 'Guided barbell on fixed vertical rails for pressing, squatting, and rowing movements.', 'https://www.youtube.com/watch?v=KSalJ1bOufU'),
  ('Ski Erg', 'cardio', 'Concept 2', 'Simulates Nordic skiing with a pull-down motion for full-body cardiovascular training.', 'https://www.youtube.com/watch?v=NU_BQajMDHg'),
  ('Rowing Machine', 'cardio', 'Concept 2', 'Full-body cardiovascular exercise using a sliding seat and handle for a rowing stroke.', 'https://www.youtube.com/watch?v=EgYJmnQa6vg'),
  ('Stationary Bike', 'cardio', 'Concept 2', 'Fixed cycling station for low-impact cardiovascular conditioning and leg endurance.', 'https://www.youtube.com/watch?v=9OcjMagV99g'),
  ('Plate Loaded Hip Extension', 'lower', 'Strength Max', 'Isolates the glutes and hamstrings by driving the hips backward against plate-loaded resistance.', 'https://www.youtube.com/watch?v=AnCkO0j6fgw'),
  ('Plate Loaded Seated Row', 'upper', 'Panatta', 'Plate-loaded machine targeting the mid-back and lats with a seated horizontal pull.', 'https://www.youtube.com/watch?v=GZbfZ033f74'),
  ('Plate Loaded Incline Chest Press', 'upper', 'Panatta', 'Targets the upper chest and front deltoids with an incline pressing motion using plates.', 'https://www.youtube.com/watch?v=SrqOu55lrYU'),
  ('Shoulder Press Machine', 'upper', 'Hammer Strength', 'Targets the deltoids and triceps with an overhead pressing motion on a lever system.', 'https://www.youtube.com/watch?v=HzIIIpMhGBk'),
  ('Decline Chest Press Machine', 'upper', 'Hammer Strength', 'Emphasises the lower chest and triceps with a downward-angled pressing path.', 'https://www.youtube.com/watch?v=xK9zpReAaFc'),
  ('Lateral Raise Machine', 'upper', 'Hammer Strength', 'Isolates the medial deltoids by raising the arms out to the sides against resistance.', 'https://www.youtube.com/watch?v=6BmU5FPyYFE'),
  ('Calf Raise', 'lower', 'Hammer Strength', 'Isolates the calf muscles through a standing or seated heel-raise against loaded resistance.', 'https://www.youtube.com/watch?v=RBiMOqGnMSc'),
  ('Squat Lunge Drive', 'lower', 'Hammer Strength', 'Plate-loaded machine that trains squat and lunge patterns with a guided foot platform.', 'https://www.youtube.com/watch?v=G_5sCHODAJg'),
  ('Reverse Hyper Extension & Back Extension', 'core', 'Hammer Strength', 'Strengthens the posterior chain — lower back, glutes, and hamstrings — via hip extension.', 'https://www.youtube.com/watch?v=ZeRsNzFcQLQ'),
  ('Plate Loaded Leg Extension', 'lower', 'Hammer Strength', 'Isolates the quadriceps by extending the knees against plate-loaded resistance.', 'https://www.youtube.com/watch?v=ljO4jkwv8wQ'),
  ('Iso Lying Leg Curl', 'lower', 'Hammer Strength', 'Isolates each hamstring independently in a lying position with a curling motion.', 'https://www.youtube.com/watch?v=1FNGMoMuGOA'),
  ('Assisted Nordic Curl', 'lower', 'Hammer Strength', 'Band- or lever-assisted Nordic curl targeting the hamstrings eccentrically.', 'https://www.youtube.com/watch?v=Wnx13YAGKWA'),
  ('Tricep Pushdown', 'upper', 'Gymleco', 'Cable-based exercise isolating the triceps through an elbow extension pushdown.', 'https://www.youtube.com/watch?v=2-LAMcpzODU'),
  ('Plate Loaded T-Bar Row', 'upper', 'Gymleco', 'Targets the mid-back and lats by rowing a pivoting barbell loaded with plates.', 'https://www.youtube.com/watch?v=j3Igk5nyZE4'),
  ('Standing Chest Press', 'upper', 'Gymleco', 'Plate-loaded press performed from a standing position to engage the chest and core.', 'https://www.youtube.com/watch?v=8urE8Z4FV18'),
  ('Plate Loaded Horizontal Leg Press', 'lower', 'Gymleco', 'Targets the quads, glutes, and hamstrings by pressing a sled horizontally with plates.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Plate Loaded Pendulum Squat', 'lower', 'Gymleco', 'Guided squat machine with a pendulum arm that emphasises the quads and glutes.', 'https://www.youtube.com/watch?v=g6EUlCDpRrc'),
  ('Plate Loaded Hack Squat', 'lower', 'Gymleco', 'Angled sled machine targeting the quads with a deep squatting motion using plates.', 'https://www.youtube.com/watch?v=0tn5K9NlCGc'),
  ('Plate Loaded Leg Press', 'lower', 'Gymleco', 'Seated press targeting the quads, glutes, and hamstrings by pushing a plate-loaded sled.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Cable Machine - Bicep Curl', 'upper', 'Gymleco', 'Cable-based exercise isolating the biceps through a curling motion with constant tension.', 'https://www.youtube.com/watch?v=NFzTWp2qpiE'),
  ('Cable Machine - Chest Fly', 'upper', 'Gymleco', 'Cable-based fly movement targeting the chest through a wide arcing motion.', 'https://www.youtube.com/watch?v=Iwe6AmxVf7o');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on routines
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC: routines_set_weekdays
-- Atomically assigns the given weekdays to the given routine, stripping those
-- days from every other routine in the same transaction. Enforces the
-- one-routine-per-day invariant at the DB layer.
CREATE OR REPLACE FUNCTION routines_set_weekdays(
  p_routine_id UUID,
  p_days SMALLINT[]
) RETURNS routines AS $$
DECLARE
  updated_routine routines;
BEGIN
  UPDATE routines
    SET assigned_weekdays = ARRAY(
      SELECT unnest(assigned_weekdays)
      EXCEPT
      SELECT unnest(p_days)
    )
    WHERE id <> p_routine_id
      AND assigned_weekdays && p_days;

  UPDATE routines
    SET assigned_weekdays = p_days
    WHERE id = p_routine_id
    RETURNING * INTO updated_routine;

  RETURN updated_routine;
END;
$$ LANGUAGE plpgsql;

-- RPC: routine_last_sets
-- Returns the most recent recorded set per routine_item for a given routine,
-- across all completed sessions. Used by Preview screen to surface
-- last-used weight per machine.
CREATE OR REPLACE FUNCTION routine_last_sets(p_routine_id UUID)
RETURNS TABLE (
  routine_item_id UUID,
  weight NUMERIC,
  actual_reps INTEGER,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ws.routine_item_id)
    ws.routine_item_id,
    ws.weight,
    ws.actual_reps,
    ws.completed_at
  FROM workout_sets ws
  JOIN workout_sessions s ON s.id = ws.session_id
  JOIN routine_items ri ON ri.id = ws.routine_item_id
  WHERE s.status = 'completed'
    AND ri.routine_id = p_routine_id
  ORDER BY ws.routine_item_id, ws.completed_at DESC;
END;
$$ LANGUAGE plpgsql;
