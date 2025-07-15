import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface Category {
    id: string;
    name: string;
    imageUrl: string;
    description: string;
}

const categories: Category[] = [
    {
        id: '1',
        name: 'Prove Me Wrong',
        imageUrl: 'prove-me-wrong.jpg',
        description: 'Challenge others to prove your claims wrong'
    },
    {
        id: '2',
        name: 'Relationships',
        imageUrl: 'relationships.jpg',
        description: 'Dating, friendships, and human connections'
    },
    {
        id: '3',
        name: 'War',
        imageUrl: 'war.jpg',
        description: 'Military conflicts and geopolitical discussions'
    },
    {
        id: '4',
        name: 'Politics',
        imageUrl: 'politics.jpg',
        description: 'Political discussions and policy debates'
    },
    {
        id: '5',
        name: 'Philosophy',
        imageUrl: 'philosophy.jpg',
        description: 'Deep thinking and philosophical debates'
    },
    {
        id: '6',
        name: 'Entertainment',
        imageUrl: 'entertainment.jpg',
        description: 'Movies, music, TV, and pop culture discussions'
    }
];

export default function Categories() {
    const [categoryImages, setCategoryImages] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategoryImages();
    }, []);

    const loadCategoryImages = async () => {
        try {
            const imageUrls: { [key: string]: string } = {};
            
            for (const category of categories) {
                try {
                    const { data, error } = await supabase.storage
                        .from('speak-it-brand-assets')
                        .createSignedUrl(category.imageUrl, 3600); // 1 hour expiry

                    if (error) {
                        console.error(`Error loading image for ${category.name}:`, error);
                        // Use a default image or placeholder
                        imageUrls[category.id] = 'https://via.placeholder.com/300x200?text=' + category.name;
                    } else {
                        imageUrls[category.id] = data.signedUrl;
                    }
                } catch (error) {
                    console.error(`Error processing image for ${category.name}:`, error);
                    imageUrls[category.id] = 'https://via.placeholder.com/300x200?text=' + category.name;
                }
            }
            
            setCategoryImages(imageUrls);
        } catch (error) {
            console.error('Error loading category images:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryPress = (category: Category) => {
        // Navigate to a filtered view of claims for this category
        // You can implement this later to show claims filtered by category
        router.push({
            pathname: '/Speak-It/Home',
            params: { category: category.name }
        });
    };

    const renderCategoryItem = ({ item }: { item: Category }) => (
        <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(item)}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: categoryImages[item.id] }}
                    style={styles.categoryImage}
                    resizeMode="cover"
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
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>
                Explore discussions by topic
            </Text>
            
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