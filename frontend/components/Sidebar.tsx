import { useState } from 'react';
import Link from 'next/link';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../utils/authContext';

// GraphQL query to fetch pages tree
const PAGES_QUERY = gql`
  query Pages($parentId: ID) {
    pages(parentId: $parentId) {
      id
      title
      slug
      type
      children {
        id
        title
        slug
        type
        children {
          id
          title
          slug
          type
          children {
            id
          }
        }
      }
    }
  }
`;

const CREATE_PAGE_MUTATION = gql`
  mutation CreatePage($title: String!, $slug: String!, $content: String!, $parentId: ID, $type: String!) {
    createPage(title: $title, slug: $slug, content: $content, parentId: $parentId, type: $type) {
      id
      title
      slug
      type
    }
  }
`;

interface PageNode {
  id: string;
  title: string;
  slug: string;
  type: string;
  children: PageNode[];
}

function RenderPages({ pages, level }: { pages: PageNode[]; level: number }) {
  return (
    <ul style={{ listStyle: 'none', paddingLeft: level * 10 }}>
      {pages.map((p) => (
        <li key={p.id} style={{ marginBottom: '0.5rem' }}>
          <Link href={`/${p.id}`}>{p.title}</Link>
          {p.children && p.children.length > 0 && <RenderPages pages={p.children} level={level + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar() {
  const { data, loading, error, refetch } = useQuery(PAGES_QUERY, {
    variables: { parentId: null },
  });
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', slug: '', type: 'page' });
  const [createPage] = useMutation(CREATE_PAGE_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPage({ variables: { title: formData.title, slug: formData.slug, content: '', parentId: null, type: formData.type } });
    setFormData({ title: '', slug: '', type: 'page' });
    setShowForm(false);
    refetch();
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error loading pages</div>;

  const pages: PageNode[] = data.pages;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Pages</h3>
        {user && (
          <button onClick={() => setShowForm(!showForm)} style={{ cursor: 'pointer' }}>
            {showForm ? 'Cancel' : 'New'}
          </button>
        )}
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{ width: '100%', marginBottom: '0.5rem' }}
            required
          />
          <input
            type="text"
            placeholder="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            style={{ width: '100%', marginBottom: '0.5rem' }}
            required
          />
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            <option value="page">Page</option>
            <option value="api">API</option>
            <option value="sql">SQL</option>
            <option value="corezoid">Corezoid</option>
            <option value="bitrix">Bitrix</option>
          </select>
          <button type="submit" style={{ width: '100%' }}>Create</button>
        </form>
      )}
      <RenderPages pages={pages} level={0} />
    </div>
  );
}