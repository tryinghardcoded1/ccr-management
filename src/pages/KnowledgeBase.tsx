import { useState, useEffect } from 'react';
import { FileText, BookOpen, Calculator, Play, DollarSign, Plus, Trash2 } from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [newArticle, setNewArticle] = useState({ title: '', category: '', content: '' });

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'knowledgeBase'));
        const querySnapshot = await getDocs(q);
        const fetchedArticles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
        console.log('Fetched articles:', fetchedArticles);
        setArticles(fetchedArticles);

        // Temporary population if empty
        if (fetchedArticles.length === 0) {
          console.log('Populating articles...');
          const initialArticles = [
            { title: 'How to create a reservation', category: 'General', content: 'Click on New Reservation in the dashboard, fill in the details, and click Save.', createdAt: new Date().toISOString() },
            { title: 'Updating vehicle status', category: 'Fleet', content: 'Navigate to the Vehicles page, find the vehicle, and use the status dropdown.', createdAt: new Date().toISOString() }
          ];
          for (const art of initialArticles) {
            await addDoc(collection(db, 'knowledgeBase'), art);
          }
          // Refresh after adding
          const updatedSnapshot = await getDocs(q);
          setArticles(updatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
          console.log('Articles populated.');
        }
      } catch (error) {
        console.error('Error fetching/populating articles:', error);
      }
    };
    fetchArticles();
  }, []);

  const handleAddArticle = async () => {
    if (!newArticle.title || !newArticle.content) return;
    const docRef = await addDoc(collection(db, 'knowledgeBase'), {
      ...newArticle,
      createdAt: new Date().toISOString()
    });
    setArticles([{ id: docRef.id, ...newArticle, createdAt: new Date().toISOString() }, ...articles]);
    setNewArticle({ title: '', category: '', content: '' });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'knowledgeBase', id));
    setArticles(articles.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans pb-16 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Official Knowledge Base</h1>
        <p className="text-slate-500 font-medium max-w-lg">Manage articles and information here.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4">Add New Article</h2>
        <input className="w-full p-3 mb-2 border rounded-xl" placeholder="Title" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} />
        <input className="w-full p-3 mb-2 border rounded-xl" placeholder="Category" value={newArticle.category} onChange={e => setNewArticle({...newArticle, category: e.target.value})} />
        <textarea className="w-full p-3 mb-2 border rounded-xl" placeholder="Content" value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} />
        <button className="bg-blue-600 text-white px-6 py-2 rounded-xl flex items-center gap-2" onClick={handleAddArticle}><Plus className="w-4 h-4"/> Add Article</button>
      </div>

      <div className="grid gap-6">
        {articles.map(article => (
          <div key={article.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{article.title}</h3>
              <p className="text-sm text-slate-500 mb-2">{article.category}</p>
              <p className="text-slate-600">{article.content}</p>
            </div>
            <button onClick={() => handleDelete(article.id)} className="text-red-500 hover:text-red-700">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
