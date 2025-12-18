import { useRouter } from 'next/router';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../utils/authContext';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const PAGE_QUERY = gql`
  query Page($id: ID!) {
    page(id: $id) {
      id
      title
      slug
      content
      parentId
      type
      children {
        id
        title
      }
    }
  }
`;

const UPDATE_PAGE_MUTATION = gql`
  mutation UpdatePage($id: ID!, $input: PageUpdateInput!) {
    updatePage(id: $id, input: $input) {
      id
      title
      slug
      content
    }
  }
`;

export default function Page() {
  const router = useRouter();
  const { id } = router.query;
  const { loading: authLoading, user } = useAuth();
  const { data, loading, error, refetch } = useQuery(PAGE_QUERY, {
    variables: { id },
    skip: !id,
  });
  const [updatePage] = useMutation(UPDATE_PAGE_MUTATION);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '' });

  // Initialize Tiptap editor with empty content; we update once data loads
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: editMode,
  });

  // When data is loaded, set form fields and editor content
  useEffect(() => {
    if (data && data.page) {
      const p = data.page;
      setForm({ title: p.title, slug: p.slug });
      if (editor && !editMode) {
        editor.commands.setContent(p.content || '');
      }
    }
  }, [data, editor, editMode]);

  // Update editor editable state when editMode changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({ editable: editMode });
    }
  }, [editMode, editor]);

  const handleSave = async () => {
    if (!data || !data.page) return;
    const newContent = editor ? editor.getHTML() : '';
    await updatePage({
      variables: {
        id: data.page.id,
        input: {
          title: form.title,
          slug: form.slug,
          content: newContent,
        },
      },
    });
    setEditMode(false);
    refetch();
  };

  const handleCancel = () => {
    // Reset editor content and form fields to original values
    if (data && data.page) {
      editor?.commands.setContent(data.page.content || '');
      setForm({ title: data.page.title, slug: data.page.slug });
    }
    setEditMode(false);
  };

  if (authLoading || loading) {
    return <div>Loading…</div>;
  }
  if (error) {
    return <div>Error loading page</div>;
  }
  if (!data || !data.page) {
    return <div>Page not found</div>;
  }
  const page = data.page;

  return (
    <Layout>
      <div>
        {editMode ? (
          <div>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <div className="editor-container">
              {editor && <EditorContent editor={editor} />}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={handleSave} style={{ marginRight: '0.5rem' }}>Save</button>
              <button onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h2>{page.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
            <div style={{ marginTop: '0.5rem' }}>
              {user && <button onClick={() => setEditMode(true)}>Edit</button>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}