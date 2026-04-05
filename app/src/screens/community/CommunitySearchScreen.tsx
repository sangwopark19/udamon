import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useCommunity } from '../../contexts/CommunityContext';
import type { CommunityPostWithAuthor } from '../../types/community';
import type { RootStackParamList } from '../../types/navigation';
import CommunityPostCard from '../../components/community/CommunityPostCard';
import { colors, fontSize, fontWeight, radius } from '../../styles/theme';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CommunitySearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {
    searchPosts,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useCommunity();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommunityPostWithAuthor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    addRecentSearch(q);
    setResults(searchPosts(q));
    setHasSearched(true);
  }, [query, searchPosts, addRecentSearch]);

  const handleRecentSearch = useCallback((q: string) => {
    setQuery(q);
    addRecentSearch(q);
    setResults(searchPosts(q));
    setHasSearched(true);
  }, [searchPosts, addRecentSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  const handlePostPress = useCallback((postId: string) => {
    navigation.navigate('CommunityPostDetail', { postId });
  }, [navigation]);

  const renderPost = useCallback(({ item }: { item: CommunityPostWithAuthor }) => (
    <CommunityPostCard post={item} onPress={handlePostPress} />
  ), [handlePostPress]);

  const renderEmpty = useCallback(() => {
    if (!hasSearched) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{t('empty_no_results')}</Text>
      </View>
    );
  }, [hasSearched]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('community_search')}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent Searches (shown when not searched yet) */}
      {!hasSearched && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t('search_recent')}</Text>
            <TouchableOpacity onPress={clearRecentSearches} activeOpacity={0.7}>
              <Text style={styles.recentClear}>{t('search_clear')}</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((q) => (
            <View key={q} style={styles.recentItem}>
              <TouchableOpacity
                style={styles.recentItemLeft}
                onPress={() => handleRecentSearch(q)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                <Text style={styles.recentItemText}>{q}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeRecentSearch(q)} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search Results */}
      {hasSearched && (
        <FlatList
          data={results}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    padding: 0,
  },

  // Recent searches
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.name,
    color: colors.textPrimary,
  },
  recentClear: {
    fontSize: fontSize.meta,
    color: colors.textTertiary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  recentItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentItemText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
});
