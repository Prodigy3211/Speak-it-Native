import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { CATEGORIES } from '@/lib/constants';
import { CATEGORY_IMAGES } from '@/lib/categoryImages';
import { hapticFeedback } from '@/lib/haptics';

const { width } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

const categories: Category[] = CATEGORIES.map((name, index) => {
  const descriptions = {
    'Prove Me Wrong': 'Challenge others to prove your claims wrong',
    Relationships: 'Dating, friendships, and human connections',
    War: 'Military conflicts and geopolitical discussions',
    Politics: 'Political discussions and policy debates',
    Philosophy: 'Deep thinking and philosophical debates',
    Entertainment: 'Movies, music, TV, and pop culture discussions',
  };

  return {
    id: (index + 1).toString(),
    name,
    imageUrl: CATEGORY_IMAGES[name as keyof typeof CATEGORY_IMAGES],
    description: descriptions[name as keyof typeof descriptions],
  };
});

export default function Categories() {
  const [categoryImages, setCategoryImages] = useState<{
    [key: string]: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoryImages();
  }, []);

  const loadCategoryImages = async () => {
    try {
      const imageUrls: { [key: string]: string } = {};

      for (const category of categories) {
        imageUrls[category.id] = category.imageUrl;
      }

      setCategoryImages(imageUrls);
    } catch (error) {
      console.error('Error loading category images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (category: Category) => {
    // Navigate to the category claims view
    router.push({
      pathname: '/Speak-It/CategoryClaims' as any,
      params: { category: category.name },
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => {
        handleCategoryPress(item);
        hapticFeedback.select();
      }}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: categoryImages[item.id] }}
          style={styles.categoryImage}
          resizeMode='cover'
        />
        <View style={styles.imageOverlay}>
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <Text style={styles.subtitle}>Explore discussions by topic</Text>

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryCard: {
    width: (width - 48) / 2, // Account for padding and gap
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  categoryName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  categoryInfo: {
    padding: 12,
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});
