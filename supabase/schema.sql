-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- machines (seeded with 12 gym machines)
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK (category IN ('upper', 'lower', 'core', 'cardio'))
);

-- routines
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,
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
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routines(id),
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

-- Seed machines data
INSERT INTO machines (name, category) VALUES
  ('Chest Press', 'upper'),
  ('Lat Pulldown', 'upper'),
  ('Shoulder Press', 'upper'),
  ('Cable Row', 'upper'),
  ('Bicep Curl Machine', 'upper'),
  ('Tricep Pushdown', 'upper'),
  ('Leg Press', 'lower'),
  ('Leg Extension', 'lower'),
  ('Leg Curl', 'lower'),
  ('Calf Raise Machine', 'lower'),
  ('Cable Crunch', 'core'),
  ('Treadmill', 'cardio');

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
