-- Migration: Admin policies for saved items
-- This migration ensures admins can view, update and delete saved questionnaires and scenarios from other users

DO $$
BEGIN
    -- Saved Questionnaires: SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'saved_questionnaires' AND policyname = 'Admins can view all saved questionnaires'
    ) THEN
        CREATE POLICY "Admins can view all saved questionnaires" ON saved_questionnaires FOR SELECT USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
    
    -- Saved Questionnaires: UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'saved_questionnaires' AND policyname = 'Admins can update all saved questionnaires'
    ) THEN
        CREATE POLICY "Admins can update all saved questionnaires" ON saved_questionnaires FOR UPDATE USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Saved Questionnaires: DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'saved_questionnaires' AND policyname = 'Admins can delete all saved questionnaires'
    ) THEN
        CREATE POLICY "Admins can delete all saved questionnaires" ON saved_questionnaires FOR DELETE USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Cattle Scenarios: UPDATE (SELECT likely exists from migration 002)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cattle_scenarios' AND policyname = 'Admins can update all scenarios'
    ) THEN
        CREATE POLICY "Admins can update all scenarios" ON cattle_scenarios FOR UPDATE USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Cattle Scenarios: DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cattle_scenarios' AND policyname = 'Admins can delete all scenarios'
    ) THEN
        CREATE POLICY "Admins can delete all scenarios" ON cattle_scenarios FOR DELETE USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
