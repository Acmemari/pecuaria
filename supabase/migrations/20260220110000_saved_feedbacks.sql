CREATE TABLE IF NOT EXISTS public.saved_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  context TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  objective TEXT NOT NULL,
  what_happened TEXT,
  event_date DATE,
  event_moment TEXT,
  damages TEXT,
  tone TEXT NOT NULL,
  format TEXT NOT NULL,
  structure TEXT NOT NULL,
  length_preference TEXT NOT NULL,
  generated_feedback TEXT NOT NULL,
  generated_structure TEXT NOT NULL,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  farm_id TEXT REFERENCES public.farms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_feedbacks_created_by ON public.saved_feedbacks(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_feedbacks_recipient_email ON public.saved_feedbacks(recipient_email);
CREATE INDEX IF NOT EXISTS idx_saved_feedbacks_created_at ON public.saved_feedbacks(created_at DESC);

ALTER TABLE public.saved_feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_feedbacks_select_sender_or_recipient" ON public.saved_feedbacks;
DROP POLICY IF EXISTS "saved_feedbacks_insert_sender_only" ON public.saved_feedbacks;
DROP POLICY IF EXISTS "saved_feedbacks_update_sender_only" ON public.saved_feedbacks;
DROP POLICY IF EXISTS "saved_feedbacks_delete_sender_only" ON public.saved_feedbacks;

CREATE POLICY "saved_feedbacks_select_sender_or_recipient"
  ON public.saved_feedbacks
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR (
      recipient_email IS NOT NULL
      AND lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY "saved_feedbacks_insert_sender_only"
  ON public.saved_feedbacks
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "saved_feedbacks_update_sender_only"
  ON public.saved_feedbacks
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "saved_feedbacks_delete_sender_only"
  ON public.saved_feedbacks
  FOR DELETE
  USING (auth.uid() = created_by);
