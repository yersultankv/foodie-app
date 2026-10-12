import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, TextInput,
  Image, StyleSheet, Platform, StatusBar, BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { CATEGORIES, RECIPES } from './data';

const ORANGE = '#F4743B';
const DIFFS = ['Оңай', 'Орташа', 'Қиын'];

export default function App() {
  const [stack, setStack] = useState([{ name: 'home' }]);
  const [category, setCategory] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const screen = stack[stack.length - 1];
  const push = (name, params = {}) => setStack((s) => [...s, { name, params }]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  // Android hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack]);

  // Load / save
  useEffect(() => {
    (async () => {
      try {
        const f = await AsyncStorage.getItem('fav');
        const m = await AsyncStorage.getItem('mine');
        if (f) setFavorites(JSON.parse(f));
        if (m) setMyRecipes(JSON.parse(m));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem('fav', JSON.stringify(favorites)).catch(() => {});
    AsyncStorage.setItem('mine', JSON.stringify(myRecipes)).catch(() => {});
  }, [favorites, myRecipes, loaded]);

  const all = useMemo(() => [...RECIPES, ...myRecipes], [myRecipes]);
  const toggleFav = (id) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const getRecipe = (id) => all.find((r) => r.id === id);

  const saveRecipe = (r) => {
    setMyRecipes((list) =>
      list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]
    );
  };
  const deleteRecipe = (id) => {
    setMyRecipes((l) => l.filter((x) => x.id !== id));
    setFavorites((f) => f.filter((x) => x !== id));
  };

  return (
    <View style={s.root}>
      {screen.name === 'home' && (
        <Home
          category={category} setCategory={setCategory} recipes={all}
          favorites={favorites} toggleFav={toggleFav}
          openRecipe={(id) => push('detail', { id })}
          openMyFood={() => push('myfood')}
          openFavs={() => push('favorites')}
        />
      )}
      {screen.name === 'favorites' && (
        <ListScreen
          title="Таңдаулылар ♥" onBack={back}
          recipes={all.filter((r) => favorites.includes(r.id))}
          favorites={favorites} toggleFav={toggleFav}
          openRecipe={(id) => push('detail', { id })}
          empty="Әзірге таңдаулы рецепт жоқ. Рецепт ішіндегі ♡ белгісін басыңыз."
        />
      )}
      {screen.name === 'myfood' && (
        <MyFood
          onBack={back} recipes={myRecipes}
          openRecipe={(id) => push('detail', { id })}
          onAdd={() => push('form', {})}
        />
      )}
      {screen.name === 'detail' && getRecipe(screen.params.id) && (
        <Detail
          recipe={getRecipe(screen.params.id)} onBack={back}
          fav={favorites.includes(screen.params.id)}
          toggleFav={() => toggleFav(screen.params.id)}
          onEdit={() => push('form', { id: screen.params.id })}
          onDelete={() => { deleteRecipe(screen.params.id); back(); }}
        />
      )}
      {screen.name === 'form' && (
        <RecipeForm
          onBack={back}
          existing={screen.params.id ? getRecipe(screen.params.id) : null}
          onSave={(r) => { saveRecipe(r); back(); }}
        />
      )}
    </View>
  );
}

/* ---------- Shared ---------- */
function Header({ title, onBack, right }) {
  return (
    <View style={s.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={s.backBtn} testID="back-button">
          <Text style={s.backTxt}>← Артқа</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 80 }} />}
      <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 80, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

function RecipeCard({ recipe, fav, toggleFav, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={s.cardImg} />
      ) : (
        <View style={[s.cardImg, s.emojiBox]}><Text style={{ fontSize: 44 }}>{recipe.emoji || '🍽️'}</Text></View>
      )}
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={s.cardTitle}>{recipe.title}</Text>
        <Text style={s.cardMeta}>⏱ {recipe.time}  •  🔥 {recipe.calories} ккал</Text>
        <Text style={s.cardMeta}>{recipe.difficulty}</Text>
      </View>
      {toggleFav && (
        <TouchableOpacity onPress={toggleFav} style={s.heartBtn} hitSlop={10}>
          <Text style={[s.heart, fav && { color: '#E53935' }]}>{fav ? '♥' : '♡'}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ---------- Home ---------- */
function Home({ category, setCategory, recipes, favorites, toggleFav, openRecipe, openMyFood, openFavs }) {
  const list = category ? recipes.filter((r) => r.category === category) : recipes;
  const cat = CATEGORIES.find((c) => c.id === category);
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="🍴 Foodie"
        right={<TouchableOpacity onPress={openFavs}><Text style={s.favLink}>♥ Таңдаулы</Text></TouchableOpacity>}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          <TouchableOpacity style={[s.chip, s.chipMine]} onPress={openMyFood}>
            <Text style={s.chipEmoji}>👩‍🍳</Text>
            <Text style={[s.chipTxt, { color: '#fff' }]}>Менің тағамым</Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <TouchableOpacity
                key={c.id} style={[s.chip, active && s.chipActive]}
                onPress={() => setCategory(active ? null : c.id)}
              >
                <Text style={s.chipEmoji}>{c.emoji}</Text>
                <Text style={[s.chipTxt, active && { color: '#fff' }]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <Text style={s.sectionTitle}>{cat ? `${cat.emoji} ${cat.name}` : 'Барлық рецепттер'}</Text>
      <FlatList
        data={list} keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={<Text style={s.empty}>Бұл санатта рецепт жоқ.</Text>}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item} fav={favorites.includes(item.id)}
            toggleFav={() => toggleFav(item.id)} onPress={() => openRecipe(item.id)}
          />
        )}
      />
    </View>
  );
}

function ListScreen({ title, onBack, recipes, favorites, toggleFav, openRecipe, empty }) {
  return (
    <View style={{ flex: 1 }}>
      <Header title={title} onBack={onBack} />
      <FlatList
        data={recipes} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>{empty}</Text>}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item} fav={favorites.includes(item.id)}
            toggleFav={() => toggleFav(item.id)} onPress={() => openRecipe(item.id)}
          />
        )}
      />
    </View>
  );
}

/* ---------- My Food ---------- */
function MyFood({ onBack, recipes, openRecipe, onAdd }) {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Менің тағамым" onBack={onBack} />
      <TouchableOpacity style={s.primaryBtn} onPress={onAdd}>
        <Text style={s.primaryTxt}>＋ Жаңа рецепт қосу</Text>
      </TouchableOpacity>
      <Text style={s.sectionTitle}>Менің рецепттерім</Text>
      <FlatList
        data={recipes} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={<Text style={s.empty}>Сіз әлі рецепт қосқан жоқсыз.</Text>}
        renderItem={({ item }) => <RecipeCard recipe={item} onPress={() => openRecipe(item.id)} />}
      />
    </View>
  );
}

/* ---------- Detail ---------- */
function Detail({ recipe, onBack, fav, toggleFav, onEdit, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  const isMine = String(recipe.id).startsWith('u');
  const Meta = ({ icon, label, value }) => (
    <View style={s.metaBox}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={s.metaVal}>{value}</Text>
      <Text style={s.metaLbl}>{label}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <Header
        title="Рецепт" onBack={onBack}
        right={<TouchableOpacity onPress={toggleFav}><Text style={[s.heart, fav && { color: '#E53935' }]}>{fav ? '♥' : '♡'}</Text></TouchableOpacity>}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={s.heroImg} />
        ) : (
          <View style={[s.heroImg, s.emojiBox]}><Text style={{ fontSize: 90 }}>{recipe.emoji || '🍽️'}</Text></View>
        )}
        <Text style={s.title}>{recipe.title}</Text>
        <View style={s.metaRow}>
          <Meta icon="⏱" label="Уақыты" value={recipe.time || '—'} />
          <Meta icon="🍽" label="Порция" value={recipe.servings || '—'} />
          <Meta icon="🔥" label="Калория" value={recipe.calories ? `${recipe.calories}` : '—'} />
          <Meta icon="📶" label="Күрделілік" value={recipe.difficulty || '—'} />
        </View>
        <Text style={s.h2}>Ингредиенттер</Text>
        {recipe.ingredients.map((i, k) => <Text key={k} style={s.li}>• {i}</Text>)}
        <Text style={s.h2}>Дайындалу жолы</Text>
        {recipe.steps.map((t, k) => (
          <View key={k} style={s.stepRow}>
            <View style={s.stepNum}><Text style={{ color: '#fff', fontWeight: '700' }}>{k + 1}</Text></View>
            <Text style={s.stepTxt}>{t}</Text>
          </View>
        ))}
        {isMine && (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity style={s.primaryBtnInline} onPress={onEdit}>
              <Text style={s.primaryTxt}>✏️ Өңдеу</Text>
            </TouchableOpacity>
            {!confirm ? (
              <TouchableOpacity style={s.dangerBtn} onPress={() => setConfirm(true)}>
                <Text style={s.primaryTxt}>🗑 Жою</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.confirmBox}>
                <Text style={{ textAlign: 'center', marginBottom: 8 }}>Рецептті шынымен жоясыз ба?</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[s.dangerBtn, { flex: 1, marginTop: 0 }]} onPress={onDelete}>
                    <Text style={s.primaryTxt}>Иә, жою</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setConfirm(false)}>
                    <Text style={{ fontWeight: '600' }}>Болдырмау</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- Add / Edit form ---------- */
function RecipeForm({ onBack, existing, onSave }) {
  const [title, setTitle] = useState(existing?.title || '');
  const [image, setImage] = useState(existing?.image || null);
  const [ingredients, setIngredients] = useState(existing ? existing.ingredients.join('\n') : '');
  const [steps, setSteps] = useState(existing ? existing.steps.join('\n') : '');
  const [time, setTime] = useState(existing?.time || '');
  const [servings, setServings] = useState(existing?.servings ? String(existing.servings) : '');
  const [calories, setCalories] = useState(existing?.calories ? String(existing.calories) : '');
  const [difficulty, setDifficulty] = useState(existing?.difficulty || 'Оңай');
  const [error, setError] = useState('');

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3],
      });
      if (!res.canceled) setImage(res.assets[0].uri);
    } catch (e) { setError('Суретті жүктеу мүмкін болмады'); }
  };

  const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);

  const save = () => {
    if (!title.trim()) return setError('Рецепт атауын енгізіңіз');
    if (!lines(ingredients).length) return setError('Ингредиенттерді енгізіңіз');
    if (!lines(steps).length) return setError('Дайындалу қадамдарын енгізіңіз');
    onSave({
      id: existing?.id || 'u' + Date.now(),
      category: existing?.category || 'main',
      title: title.trim(), image, emoji: '🍽️',
      ingredients: lines(ingredients), steps: lines(steps),
      time: time.trim() || '—', servings: servings.trim() || '—',
      calories: calories.trim() || '—', difficulty,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={existing ? 'Рецептті өңдеу' : 'Жаңа рецепт'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={s.label}>Рецепт атауы *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Мысалы: Манты" />

        <Text style={s.label}>Сурет</Text>
        {image ? <Image source={{ uri: image }} style={s.preview} /> : null}
        <TouchableOpacity style={s.cancelBtn} onPress={pickImage}>
          <Text style={{ fontWeight: '600' }}>📷 {image ? 'Суретті ауыстыру' : 'Сурет жүктеу'}</Text>
        </TouchableOpacity>

        <Text style={s.label}>Ингредиенттер * (әр жолға біреуден)</Text>
        <TextInput style={[s.input, s.multi]} multiline value={ingredients} onChangeText={setIngredients}
          placeholder={'500 г ет\n2 пияз\nТұз'} />

        <Text style={s.label}>Қадамдық нұсқаулық * (әр жолға бір қадам)</Text>
        <TextInput style={[s.input, s.multi]} multiline value={steps} onChangeText={setSteps}
          placeholder={'Етті турап алыңыз\nПиязды қосыңыз'} />

        <Text style={s.label}>Дайындалу уақыты</Text>
        <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="30 мин" />
        <Text style={s.label}>Порция саны</Text>
        <TextInput style={s.input} value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="4" />
        <Text style={s.label}>Калория</Text>
        <TextInput style={s.input} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="350" />

        <Text style={s.label}>Күрделілік</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DIFFS.map((d) => (
            <TouchableOpacity key={d} onPress={() => setDifficulty(d)}
              style={[s.diffChip, difficulty === d && { backgroundColor: ORANGE }]}>
              <Text style={{ color: difficulty === d ? '#fff' : '#333', fontWeight: '600' }}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={[s.primaryBtnInline, { marginTop: 24 }]} onPress={save}>
          <Text style={s.primaryTxt}>Рецептті сақтау</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F3', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#222' },
  backBtn: { width: 80 }, backTxt: { color: ORANGE, fontWeight: '700', fontSize: 16 },
  favLink: { color: '#E53935', fontWeight: '700' },
  catRow: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 4, borderWidth: 1, borderColor: '#F0DDD0' },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipMine: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipEmoji: { fontSize: 18, marginRight: 6 }, chipTxt: { fontWeight: '600', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginTop: 8, marginBottom: 8, color: '#222' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardImg: { width: 100, height: 100 },
  emojiBox: { backgroundColor: '#FFE9DC', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#222', paddingRight: 28 },
  cardMeta: { color: '#777', fontSize: 13, marginTop: 2 },
  heartBtn: { position: 'absolute', right: 10, top: 8 },
  heart: { fontSize: 28, color: '#999' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, paddingHorizontal: 20 },
  heroImg: { width: '100%', height: 220, borderRadius: 16 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 14, color: '#222' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
  metaBox: { width: '23%', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  metaVal: { fontWeight: '800', marginTop: 4, color: '#222', fontSize: 13, textAlign: 'center' },
  metaLbl: { color: '#888', fontSize: 11, marginTop: 2 },
  h2: { fontSize: 20, fontWeight: '800', marginTop: 22, marginBottom: 8, color: '#222' },
  li: { fontSize: 16, marginVertical: 3, color: '#333' },
  stepRow: { flexDirection: 'row', marginBottom: 10 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepTxt: { flex: 1, fontSize: 16, color: '#333', lineHeight: 22 },
  primaryBtn: { backgroundColor: ORANGE, margin: 16, marginBottom: 4, padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnInline: { backgroundColor: ORANGE, padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dangerBtn: { backgroundColor: '#E53935', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  cancelBtn: { backgroundColor: '#EEE', padding: 14, borderRadius: 14, alignItems: 'center' },
  confirmBox: { marginTop: 10, backgroundColor: '#fff', padding: 12, borderRadius: 14 },
  label: { fontWeight: '700', marginTop: 16, marginBottom: 6, color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#EADBCF' },
  multi: { minHeight: 110, textAlignVertical: 'top' },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  diffChip: { flex: 1, backgroundColor: '#EEE', padding: 12, borderRadius: 12, alignItems: 'center' },
  error: { color: '#E53935', marginTop: 14, fontWeight: '600' },
});
