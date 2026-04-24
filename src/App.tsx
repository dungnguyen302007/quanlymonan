import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, 
  Search, 
  Plus, 
  Calendar, 
  Refrigerator, 
  ChefHat, 
  TrendingUp, 
  Clock, 
  Users,
  ChevronRight,
  Heart,
  Droplets,
  Zap,
  CheckCircle2,
  Brain,
  LogIn,
  LogOut
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User 
} from 'firebase/auth';
import { db, auth } from './lib/firebase';

// Types
interface Recipe {
  id: string;
  title: string;
  image: string;
  time: string;
  servings: number;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  calories: number;
  protein: number;
  tags: string[];
  ingredients: string[];
  instructions: string[];
  authorId?: string;
}

// Initial Data for Fallback
const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Phở Chay Hà Nội',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?q=80&w=800&auto=format&fit=crop',
    time: '45 phút',
    servings: 2,
    difficulty: 'Trung bình',
    calories: 350,
    protein: 12,
    tags: ['Truyền thống', 'Ăn sáng'],
    ingredients: ['Bánh phở', 'Nấm hương', 'Đậu phụ', 'Gừng', 'Hành tây', 'Hồi', 'Quế'],
    instructions: ['Nấu nước dùng từ rau củ và gia vị', 'Sơ chế đậu phụ và nấm', 'Trần bánh phở', 'Trình bày và thưởng thức']
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recipes' | 'planner' | 'inventory'>('dashboard');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAiGen, setShowAiGen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Test Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  // Sync Recipes from Firestore
  useEffect(() => {
    const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Recipe[];
      
      setRecipes(data.length > 0 ? data : INITIAL_RECIPES);
    }, (error) => {
      console.error("Firestore error:", error);
      if (recipes.length === 0) setRecipes(INITIAL_RECIPES);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login Error:", err);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="w-12 h-12 border-4 border-brand-olive border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-20">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogin={handleLogin} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight">
                    {user ? `Chào buổi sáng, ${user.displayName?.split(' ')[0]}` : 'Chào mừng bạn'}
                  </h1>
                  <p className="text-stone-500 mt-2">Hôm nay bạn muốn ăn gì để nạp năng lượng?</p>
                </div>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setShowAiGen(true)}
                    className="flex items-center gap-2 bg-brand-olive text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium"
                   >
                    <Brain className="w-4 h-4" />
                    AI Gợi ý món
                   </button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard icon={<Droplets className="text-blue-500" />} label="Nước" value="1.2L" target="2.5L" percent={48} />
                  <StatCard icon={<Zap className="text-amber-500" />} label="Năng lượng" value="1,200" unit="kcal" target="2,000" percent={60} />
                  <StatCard icon={<Leaf className="text-green-500" />} label="Chất xơ" value="18g" target="25g" percent={72} />
                </div>

                <div className="warm-card p-6">
                  <h3 className="text-xl mb-4 font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-olive" />
                    Kế hoạch hôm nay
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-brand-cream rounded-2xl">
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xs font-bold text-brand-olive border border-stone-100">
                        Sáng
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">Phở Chay</p>
                        <p className="text-xs text-stone-500">Đã hoàn thành</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl">Gợi ý cho tuần tới</h2>
                  <button onClick={() => setActiveTab('recipes')} className="text-brand-olive font-medium flex items-center gap-1 hover:gap-2 transition-all">
                    Xem tất cả <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.slice(0, 3).map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'recipes' && (
            <motion.div
              key="recipes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <header className="space-y-4">
                <h1 className="text-5xl">Khám phá kho công thức</h1>
                <div className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm món phở, đậu phụ, nấm..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-full py-4 pl-12 pr-6 outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all shadow-sm"
                  />
                </div>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())).map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
                {user ? (
                  <button onClick={() => setShowAiGen(true)} className="warm-card border-dashed border-2 flex flex-col items-center justify-center p-8 text-stone-400 hover:text-brand-olive hover:border-brand-olive transition-all group">
                    <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Thêm món mới</span>
                  </button>
                ) : (
                  <button onClick={handleLogin} className="warm-card border-dashed border-2 flex flex-col items-center justify-center p-8 text-stone-400 hover:text-brand-olive hover:border-brand-olive transition-all group">
                    <LogIn className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-center">Đăng nhập để thêm món</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'planner' && <PlaceholderSection title="Lịch thực đơn" icon={<Calendar />} />}
          {activeTab === 'inventory' && <PlaceholderSection title="Tủ lạnh sạch" icon={<Refrigerator />} />}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAiGen && (
          <AiGenerator user={user} onClose={() => setShowAiGen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Navigation({ activeTab, setActiveTab, user, onLogin, onLogout }: any) {
  const tabs = [
    { id: 'dashboard', icon: Leaf, label: 'Tổng quan' },
    { id: 'recipes', icon: ChefHat, label: 'Công thức' },
    { id: 'planner', icon: Calendar, label: 'Lên lịch' },
    { id: 'inventory', icon: Refrigerator, label: 'Tủ lạnh' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 md:top-0 md:left-0 md:bottom-0 md:w-20 md:border-t-0 md:border-r flex md:flex-col items-center justify-around md:justify-center md:gap-8 z-50">
      <div className="hidden md:flex mb-auto pt-4 text-brand-olive">
        <Leaf className="w-8 h-8" />
      </div>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-brand-olive scale-110' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <div className={`p-2 rounded-2xl ${isActive ? 'bg-brand-cream' : ''}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold md:hidden">{tab.label}</span>
          </button>
        );
      })}
      <div className="mt-auto flex md:flex-col gap-4 pb-4">
        {user ? (
          <>
            <button onClick={onLogout} className="text-stone-400 hover:text-red-500 transition-colors p-2">
              <LogOut className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-brand-cream">
              <img src={user.photoURL || ''} alt="avatar" className="w-full h-full object-cover" />
            </div>
          </>
        ) : (
          <button onClick={onLogin} className="text-stone-400 hover:text-brand-olive transition-colors p-2">
            <LogIn className="w-6 h-6" />
          </button>
        )}
      </div>
    </nav>
  );
}

function StatCard({ icon, label, value, unit, target, percent }: any) {
  return (
    <div className="warm-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center">{icon}</div>
        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold">{value}</span>
        {unit && <span className="text-sm text-stone-500">{unit}</span>}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold text-stone-400">
          <span>{percent}% mục tiêu</span>
          <span>đích: {target}</span>
        </div>
        <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className="h-full bg-brand-olive rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

const RecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="warm-card group cursor-pointer overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-400 hover:text-red-500 transition-colors">
          <Heart className="w-4 h-4" />
        </div>
        <div className="absolute bottom-4 left-4 flex gap-1">
          {recipe.tags?.slice(0, 1).map(tag => (
            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-brand-olive text-white px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-3">
        <h3 className="text-xl font-medium leading-tight group-hover:text-brand-olive transition-colors">{recipe.title}</h3>
        <div className="flex items-center justify-between text-stone-500 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{recipe.time}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{recipe.servings} suất</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{recipe.difficulty}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PlaceholderSection({ title, icon }: any) {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-stone-400 space-y-4">
      <div className="p-6 bg-white rounded-full shadow-sm border border-stone-100">
        <div className="w-12 h-12 text-brand-olive flex items-center justify-center text-2xl font-bold">
            !
        </div>
      </div>
      <h2 className="text-2xl font-medium">{title}</h2>
      <p>Tính năng đang phát triển...</p>
    </div>
  );
}

function AiGenerator({ user, onClose }: any) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [ingredients, setIngredients] = useState('');
  const [saving, setSaving] = useState(false);

  const generateRecipe = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Tạo một công thức món chay sáng tạo dựa trên các nguyên liệu sau: ${ingredients}. 
        Trả về định dạng JSON gồm: name, description, ingredients (mảng), instructions (mảng), nutrition (oject calo, protein), time (string như "30 phút"), difficulty (một trong ["Dễ", "Trung bình", "Khó"]). 
        Sử dụng tiếng Việt.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
              time: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              nutrition: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      });
      setResult(JSON.parse(response.text || "{}"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveToFirebase = async () => {
    if (!user || !result) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'recipes'), {
        title: result.name,
        description: result.description,
        ingredients: result.ingredients,
        instructions: result.instructions,
        calories: result.nutrition?.calories || 0,
        protein: result.nutrition?.protein || 0,
        time: result.time || "30 phút",
        difficulty: result.difficulty || "Dễ",
        servings: 2,
        tags: ["AI Sáng tạo"],
        image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=800&auto=format&fit=crop",
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Save Error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-brand-olive/20 backdrop-blur-md z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-stone-400 hover:text-stone-900 z-10">
          <Plus className="w-8 h-8 rotate-45" />
        </button>

        <div className="p-8 md:p-12 space-y-6">
          {!result ? (
            <>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-brand-olive" />
                </div>
                <h2 className="text-3xl">AI Đầu bếp ảo</h2>
                <p className="text-stone-500">Nhập các nguyên liệu bạn đang có, AI sẽ giúp bạn sáng tạo món ăn!</p>
              </div>

              <textarea 
                placeholder="Ví dụ: đậu phụ, nấm đông cô, cải thìa, hạt sen..."
                className="w-full bg-stone-50 border-none rounded-3xl p-6 min-h-[150px] outline-none focus:ring-2 focus:ring-brand-olive/20 text-lg"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
              />

              <button 
                onClick={generateRecipe}
                disabled={loading || !ingredients}
                className="w-full bg-brand-olive text-white py-5 rounded-full font-bold text-lg hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ChefHat /> Sáng tạo món ngay</>}
              </button>
            </>
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
              <h2 className="text-3xl font-medium">{result.name}</h2>
              <p className="text-stone-600 italic">"{result.description}"</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-brand-cream rounded-2xl text-center">
                  <p className="text-[10px] uppercase font-bold text-brand-olive opacity-60">Năng lượng</p>
                  <p className="text-xl font-bold">{result.nutrition?.calories} kcal</p>
                </div>
                <div className="p-4 bg-brand-cream rounded-2xl text-center">
                   <p className="text-[10px] uppercase font-bold text-brand-olive opacity-60">Đạm (Protein)</p>
                   <p className="text-xl font-bold">{result.nutrition?.protein}g</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold underline decoration-brand-clay/30">Nguyên liệu</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {result.ingredients.map((ing: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-stone-600 bg-stone-50 px-3 py-1 rounded-xl text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-olive" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold underline decoration-brand-clay/30">Cách làm</h3>
                <div className="space-y-3">
                  {result.instructions.map((step: string, i: number) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-brand-olive font-bold">{(i+1).toString().padStart(2, '0')}</span>
                      <p className="text-stone-700 leading-relaxed text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setResult(null)}
                  className="flex-1 border-2 border-stone-100 py-4 rounded-full text-stone-500 font-bold hover:bg-stone-50 transition-all"
                >
                  Tạo món khác
                </button>
                {user && (
                  <button 
                    onClick={saveToFirebase}
                    disabled={saving}
                    className="flex-1 bg-brand-olive text-white py-4 rounded-full font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-olive/20"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus /> Lưu vào kho</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
