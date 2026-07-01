import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Subject, Unit, StudyMaterial, Profile, Question, Solution, ContentItem } from '../types/database';

const QUERY_TIMEOUT = 10000;

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useSubjects() {
  const [state, setState] = useState<QueryState<Subject[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchSubjects = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load subjects' });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSubjects();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchSubjects]);

  return { ...state, refetch: fetchSubjects };
}

export function useUnits(subjectId?: string) {
  const [state, setState] = useState<QueryState<Unit[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchUnits = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase.from('units').select('*').order('order_index', { ascending: true });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }

      const { data, error } = await query;

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load units' });
    }
  }, [subjectId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUnits();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchUnits]);

  return { ...state, refetch: fetchUnits };
}

export function useStudyMaterials(subjectId?: string, unitId?: string) {
  const [state, setState] = useState<QueryState<StudyMaterial[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchMaterials = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load materials' });
    }
  }, [subjectId, unitId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchMaterials();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchMaterials]);

  return { ...state, refetch: fetchMaterials };
}

export function useStudents() {
  const [state, setState] = useState<QueryState<Profile[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchStudents = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load students' });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStudents();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStudents]);

  return { ...state, refetch: fetchStudents };
}

export function useSubject(subjectId: string) {
  const [state, setState] = useState<QueryState<Subject>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchSubject = useCallback(async () => {
    if (!mountedRef.current || !subjectId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load subject' });
    }
  }, [subjectId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSubject();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchSubject]);

  return { ...state, refetch: fetchSubject };
}

export function useUnit(unitId: string) {
  const [state, setState] = useState<QueryState<Unit>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchUnit = useCallback(async () => {
    if (!mountedRef.current || !unitId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load unit' });
    }
  }, [unitId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUnit();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchUnit]);

  return { ...state, refetch: fetchUnit };
}

// Question Bank Hooks
export function useQuestions(unitId?: string) {
  const [state, setState] = useState<QueryState<Question[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchQuestions = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase
        .from('question_bank')
        .select('*')
        .order('question_number', { ascending: true });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load questions' });
    }
  }, [unitId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchQuestions();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchQuestions]);

  return { ...state, refetch: fetchQuestions };
}

// Solutions Hooks
export function useSolutions(unitId?: string, questionId?: string) {
  const [state, setState] = useState<QueryState<Solution[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchSolutions = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase
        .from('solutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }
      if (questionId) {
        query = query.eq('question_id', questionId);
      }

      const { data, error } = await query;

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load solutions' });
    }
  }, [unitId, questionId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchSolutions();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchSolutions]);

  return { ...state, refetch: fetchSolutions };
}

// Content Items Hooks
export function useContentItems(unitId?: string) {
  const [state, setState] = useState<QueryState<ContentItem[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchContentItems = useCallback(async () => {
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let query = supabase
        .from('content_items')
        .select('*')
        .order('order_index', { ascending: true });

      if (unitId) {
        query = query.eq('unit_id', unitId);
      }

      const { data, error } = await query;

      if (!mountedRef.current) return;

      if (error) {
        setState({ data: null, loading: false, error: error.message });
      } else {
        setState({ data: data || [], loading: false, error: null });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({ data: null, loading: false, error: 'Failed to load content' });
    }
  }, [unitId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchContentItems();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchContentItems]);

  return { ...state, refetch: fetchContentItems };
}

// Get full content for a unit (questions, solutions, content items)
export function useUnitContent(unitId: string) {
  const [state, setState] = useState<{
    questions: Question[] | null;
    solutions: Solution[] | null;
    contentItems: ContentItem[] | null;
    loading: boolean;
    error: string | null;
  }>({
    questions: null,
    solutions: null,
    contentItems: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchContent = useCallback(async () => {
    if (!mountedRef.current || !unitId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [questionsRes, solutionsRes, contentRes] = await Promise.all([
        supabase.from('question_bank').select('*').eq('unit_id', unitId).order('question_number', { ascending: true }),
        supabase.from('solutions').select('*').eq('unit_id', unitId).order('created_at', { ascending: false }),
        supabase.from('content_items').select('*').eq('unit_id', unitId).order('order_index', { ascending: true }),
      ]);

      if (!mountedRef.current) return;

      if (questionsRes.error || solutionsRes.error || contentRes.error) {
        setState({
          questions: null,
          solutions: null,
          contentItems: null,
          loading: false,
          error: questionsRes.error?.message || solutionsRes.error?.message || contentRes.error?.message || 'Failed to load content',
        });
      } else {
        setState({
          questions: questionsRes.data || [],
          solutions: solutionsRes.data || [],
          contentItems: contentRes.data || [],
          loading: false,
          error: null,
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setState({
        questions: null,
        solutions: null,
        contentItems: null,
        loading: false,
        error: 'Failed to load content',
      });
    }
  }, [unitId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchContent();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchContent]);

  return { ...state, refetch: fetchContent };
}
