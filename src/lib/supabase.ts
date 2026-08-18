import { Note, TodoTask } from '../types';
import { getSupabase } from './supabase';

const getUserNotesKey = (userId: string) => `ws_notes_${userId}`;
const getUserTodosKey = (userId: string) => `ws_todos_${userId}`;

/**
 * 1. Helper function to validate standard PostgreSQL UUID format
 */
export function isValidUUID(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * 2. Save Note with dynamic UUID handling
 */
export async function syncSaveNote(
  userId: string,
  note: Note
): Promise<{ data: Note | null; error: string | null }> {
  const supabase = getSupabase();
  const localKey = getUserNotesKey(userId);
  let activeUserId = userId;

  if (supabase) {
    try {
      // Session verification: resolve active auth user ID
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user?.id) {
        activeUserId = user.id;
      } else if (authError) {
        console.warn('Supabase auth session fetch warning (Note):', authError.message);
      }

      const hasValidUuid = isValidUUID(note.id);

      // Build payload: omit 'id' if note.id is a client string (e.g. note-1741...)
      const payload: Record<string, any> = {
        user_id: activeUserId,
        title: note.title,
        content: note.content || '',
        tags: Array.isArray(note.tags) ? note.tags : [],
        is_pinned: Boolean(note.isPinned),
        color: note.colorScheme || 'default',
        color_scheme: note.colorScheme || 'default',
        category: note.category || 'General',
        notify_at: note.notifyAt || null,
        notified: Boolean(note.notified),
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (hasValidUuid) {
        payload.id = note.id;
      }

      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        // Existing row: upsert
        const res = await supabase
          .from('notes')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;

        // Fallback to direct insert if conflict occurs
        if (error) {
          console.warn('Upsert note fallback to insert:', error.message);
          const insertRes = await supabase
            .from('notes')
            .insert(payload)
            .select()
            .single();
          if (!insertRes.error) {
            data = insertRes.data;
            error = null;
          }
        }
      } else {
        // New row: execute insert without ID so Supabase assigns gen_random_uuid()
        const res = await supabase
          .from('notes')
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Supabase save note error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { data: null, error: error.message || 'Failed to save note to Supabase' };
      }

      if (data) {
        const savedNote: Note = {
          id: data.id, // Confirmed PostgreSQL UUID
          title: data.title || '',
          content: data.content || '',
          tags: Array.isArray(data.tags)
            ? data.tags
            : typeof data.tags === 'string'
            ? JSON.parse(data.tags || '[]')
            : [],
          category: data.category || 'General',
          colorScheme: data.color_scheme || data.color || 'default',
          isPinned: Boolean(data.is_pinned),
          notifyAt: data.notify_at || undefined,
          notified: Boolean(data.notified),
          createdAt: data.created_at || note.createdAt,
          updatedAt: data.updated_at || note.updatedAt,
        };

        // Cache locally for offline capability
        try {
          const raw = localStorage.getItem(localKey);
          const currentList: Note[] = raw ? JSON.parse(raw) : [];
          const idx = currentList.findIndex((n) => n.id === savedNote.id || n.id === note.id);
          if (idx !== -1) {
            currentList[idx] = savedNote;
          } else {
            currentList.unshift(savedNote);
          }
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching note locally:', e);
        }

        return { data: savedNote, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncSaveNote:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  // Local storage fallback for offline mode
  try {
    const raw = localStorage.getItem(localKey);
    const currentList: Note[] = raw ? JSON.parse(raw) : [];
    const idx = currentList.findIndex((n) => n.id === note.id);
    if (idx !== -1) {
      currentList[idx] = note;
    } else {
      currentList.unshift(note);
    }
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: note, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save note locally' };
  }
}

/**
 * 3. Save Todo Task with dynamic UUID handling
 */
export async function syncSaveTodo(
  userId: string,
  todo: TodoTask
): Promise<{ data: TodoTask | null; error: string | null }> {
  const supabase = getSupabase();
  const localKey = getUserTodosKey(userId);
  let activeUserId = userId;

  if (supabase) {
    try {
      // Session verification: resolve active auth user ID
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user?.id) {
        activeUserId = user.id;
      } else if (authError) {
        console.warn('Supabase auth session fetch warning (Todo):', authError.message);
      }

      const hasValidUuid = isValidUUID(todo.id);

      // Build payload: omit 'id' if todo.id is a client string (e.g. todo-1741...)
      const payload: Record<string, any> = {
        user_id: activeUserId,
        title: todo.title,
        task_name: todo.title,
        description: todo.description || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
        due_date: todo.dueDate || new Date().toISOString().split('T')[0],
        due_time: todo.dueDate || new Date().toISOString().split('T')[0],
        tags: [],
        notify_at: todo.notifyAt || null,
        notified: Boolean(todo.notified),
        category: todo.category || 'General',
        created_at: todo.createdAt || new Date().toISOString(),
      };

      if (hasValidUuid) {
        payload.id = todo.id;
      }

      let data: any = null;
      let error: any = null;

      if (hasValidUuid) {
        // Existing row: upsert
        const res = await supabase
          .from('todos')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();
        data = res.data;
        error = res.error;

        // Fallback to direct insert if conflict occurs
        if (error) {
          console.warn('Upsert todo fallback to insert:', error.message);
          const insertRes = await supabase
            .from('todos')
            .insert(payload)
            .select()
            .single();
          if (!insertRes.error) {
            data = insertRes.data;
            error = null;
          }
        }
      } else {
        // New row: execute insert without ID so Supabase assigns gen_random_uuid()
        const res = await supabase
          .from('todos')
          .insert(payload)
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('Supabase save todo error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return { data: null, error: error.message || 'Failed to save todo to Supabase' };
      }

      if (data) {
        const savedTodo: TodoTask = {
          id: data.id, // Confirmed PostgreSQL UUID
          title: data.title || data.task_name || '',
          description: data.description || '',
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          dueDate: data.due_date || data.due_time || new Date().toISOString().split('T')[0],
          notifyAt: data.notify_at || undefined,
          notified: Boolean(data.notified),
          category: data.category || 'General',
          createdAt: data.created_at || todo.createdAt,
        };

        try {
          const raw = localStorage.getItem(localKey);
          const currentList: TodoTask[] = raw ? JSON.parse(raw) : [];
          const idx = currentList.findIndex((t) => t.id === savedTodo.id || t.id === todo.id);
          if (idx !== -1) {
            currentList[idx] = savedTodo;
          } else {
            currentList.unshift(savedTodo);
          }
          localStorage.setItem(localKey, JSON.stringify(currentList));
        } catch (e) {
          console.warn('Error caching todo locally:', e);
        }

        return { data: savedTodo, error: null };
      }
    } catch (e: any) {
      console.error('Unexpected error in syncSaveTodo:', e);
      return { data: null, error: e?.message || 'Error communicating with Supabase' };
    }
  }

  // Local storage fallback for offline mode
  try {
    const raw = localStorage.getItem(localKey);
    const currentList: TodoTask[] = raw ? JSON.parse(raw) : [];
    const idx = currentList.findIndex((t) => t.id === todo.id);
    if (idx !== -1) {
      currentList[idx] = todo;
    } else {
      currentList.unshift(todo);
    }
    localStorage.setItem(localKey, JSON.stringify(currentList));
    return { data: todo, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Failed to save task locally' };
  }
}
