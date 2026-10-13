import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

type Credential = {
  id: string;
  name: string;
};

const nameSuggestions = [
  'DevBadge',
  'ReactNinja',
  'CodeWizard',
  'PixelDev',
  'FrontendPro',
  'DevMestre',
];
const credentialsStorageKey = '@devbadge/credentials';

export default function App() {
  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCredentials = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(credentialsStorageKey);
        if (!storedValue) return;

        const parsedValue: unknown = JSON.parse(storedValue);
        if (
          !Array.isArray(parsedValue) ||
          !parsedValue.every(
            (item) =>
              item &&
              typeof item.id === 'string' &&
              typeof item.name === 'string',
          )
        ) {
          throw new Error('Invalid credential data');
        }

        if (isMounted) setCredentials(parsedValue as Credential[]);
      } catch {
        if (isMounted) setStorageError(true);
      } finally {
        if (isMounted) setStorageReady(true);
      }
    };

    void loadCredentials();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || storageError) return;

    void AsyncStorage.setItem(
      credentialsStorageKey,
      JSON.stringify(credentials),
    ).catch(() => setStorageError(true));
  }, [credentials, storageError, storageReady]);

  const saveCredential = () => {
    if (!storageReady || storageError) {
      Alert.alert(
        'Armazenamento indisponível',
        'Não foi possível acessar o armazenamento local. Feche e abra o app novamente.',
      );
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      Alert.alert('Nome necessário', 'Digite um nome antes de registrar a credencial.');
      return;
    }

    const duplicate = credentials.some(
      (credential) =>
        credential.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase() &&
        credential.id !== editingId,
    );

    if (duplicate) {
      Alert.alert('Nome já cadastrado', 'Escolha outro nome para esta credencial.');
      return;
    }

    if (editingId && adminMode) {
      setCredentials((current) =>
        current.map((credential) =>
          credential.id === editingId
            ? { ...credential, name: normalizedName }
            : credential,
        ),
      );
      Alert.alert('Credencial atualizada', `O nome foi alterado para ${normalizedName}.`);
    } else {
      setCredentials((current) => [
        ...current,
        { id: `${Date.now()}-${Math.random()}`, name: normalizedName },
      ]);
      Alert.alert('Credencial registrada', `${normalizedName} foi adicionado com acesso básico.`);
    }

    setName('');
    setEditingId(null);
  };

  const startEditing = (credential: Credential) => {
    setName(credential.name);
    setEditingId(credential.id);
    setShowSuggestions(false);
  };

  const removeCredential = (credential: Credential) => {
    Alert.alert(
      'Remover credencial?',
      `A credencial de ${credential.name} será removida.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setCredentials((current) =>
              current.filter((item) => item.id !== credential.id),
            );
            if (editingId === credential.id) {
              setName('');
              setEditingId(null);
            }
          },
        },
      ],
    );
  };

  const toggleAdminMode = (enabled: boolean) => {
    setAdminMode(enabled);
    if (!enabled) {
      setName('');
      setEditingId(null);
      setShowSuggestions(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.onlineText}>SISTEMA ONLINE</Text>
          <Text style={styles.topSpacer} />
          <Text style={styles.lockIcon}>{adminMode ? '🔓' : '🔒'}</Text>
        </View>

        <Text style={styles.title}>DevBadge Profile</Text>
        <View style={styles.titleRule} />
        <Text style={styles.statusLine}>
          Status do Sistema: <Text style={styles.statusOnline}>Online</Text>
        </Text>

        <View style={styles.logoCircle}>
          <Text style={styles.logo}>⚛</Text>
        </View>
        <Text style={styles.accessBadge}>
          {adminMode ? 'Acesso Admin' : 'Acesso Básico'}
        </Text>

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Nome da credencial"
            autoCapitalize="words"
            onChangeText={setName}
            onSubmitEditing={saveCredential}
            placeholder="Digite seu nome de desenvolvedor..."
            placeholderTextColor="#78818C"
            returnKeyType="done"
            editable={storageReady && !storageError}
            style={styles.input}
            value={name}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!storageReady || storageError}
            onPress={saveCredential}
            style={({ pressed }) => [
              styles.primaryButton,
              (!storageReady || storageError) && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {!storageReady
                ? 'CARREGANDO CREDENCIAIS...'
                : editingId
                  ? 'SALVAR ALTERAÇÕES'
                  : 'REGISTRAR CREDENCIAL'}
            </Text>
          </Pressable>

          {storageError ? (
            <Text style={styles.storageError}>
              Não foi possível acessar o armazenamento local. Feche e abra o app novamente.
            </Text>
          ) : null}

          {editingId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setName('');
                setEditingId(null);
              }}
              style={styles.cancelEditButton}
            >
              <Text style={styles.cancelEditText}>Cancelar edição</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onLongPress={() =>
              Alert.alert('Dica de nomes', 'Use um nome curto e fácil de reconhecer.')
            }
            onPress={() => setShowSuggestions((visible) => !visible)}
            style={({ pressed }) => [styles.suggestionButton, pressed && styles.pressed]}
          >
            <Text style={styles.suggestionButtonText}>
              {showSuggestions ? 'Ocultar sugestões' : '✨ Sugerir nomes'}
            </Text>
          </Pressable>

          {showSuggestions ? (
            <View style={styles.suggestionsPanel}>
              <Text style={styles.suggestionsTitle}>Escolha uma sugestão</Text>
              <View style={styles.suggestionsGrid}>
                {nameSuggestions.map((suggestion) => (
                  <Pressable
                    accessibilityRole="button"
                    key={suggestion}
                    onPress={() => {
                      setName(suggestion);
                      setShowSuggestions(false);
                    }}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.adminCard}>
          <View style={styles.adminCopy}>
            <Text style={styles.adminTitle}>Ativar Modo Admin?</Text>
            <Text style={styles.adminDescription}>
              {adminMode
                ? 'Você pode editar e remover credenciais.'
                : 'Ative para alterar credenciais cadastradas.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Ativar modo administrador"
            disabled={!storageReady || storageError}
            onValueChange={toggleAdminMode}
            thumbColor="#FFFFFF"
            trackColor={{ false: '#3A414B', true: '#2388F5' }}
            value={adminMode}
          />
        </View>

        <View style={styles.credentialsHeader}>
          <Text style={styles.credentialsTitle}>Credenciais</Text>
          <Text style={styles.credentialsCount}>{credentials.length}</Text>
        </View>

        {credentials.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhuma credencial cadastrada</Text>
            <Text style={styles.emptyDescription}>
              Digite um nome acima e toque em “Registrar credencial”.
            </Text>
          </View>
        ) : (
          credentials.map((credential) => (
            <View key={credential.id} style={styles.credentialCard}>
              <View style={styles.credentialAvatar}>
                <Text style={styles.avatarText}>
                  {credential.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.credentialInfo}>
                <Text numberOfLines={1} style={styles.credentialName}>
                  {credential.name}
                </Text>
                <Text style={styles.credentialAccess}>Acesso Básico</Text>
              </View>
              {adminMode ? (
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityLabel={`Editar ${credential.name}`}
                    accessibilityRole="button"
                    onPress={() => startEditing(credential)}
                    style={styles.rowAction}
                  >
                    <Text style={styles.editAction}>Editar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Remover ${credential.name}`}
                    accessibilityRole="button"
                    onPress={() => removeCredential(credential)}
                    style={styles.rowAction}
                  >
                    <Text style={styles.removeAction}>Remover</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.lockedLabel}>🔒</Text>
              )}
            </View>
          ))
        )}

        <Text style={styles.footer}>
          {adminMode
            ? 'Modo Admin ativo • Alterações liberadas'
            : 'Credenciais protegidas • Modo Básico'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#001715',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 38,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FB950',
    marginRight: 8,
  },
  onlineText: {
    color: '#76C98B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topSpacer: {
    flex: 1,
  },
  lockIcon: {
    fontSize: 20,
  },
  title: {
    color: '#58A6FF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  titleRule: {
    height: 2,
    width: '72%',
    alignSelf: 'center',
    backgroundColor: '#238636',
    marginBottom: 12,
  },
  statusLine: {
    color: '#F0F3F6',
    fontSize: 16,
    textAlign: 'center',
  },
  statusOnline: {
    color: '#3FB950',
    fontWeight: '700',
  },
  logoCircle: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#20272B',
    borderRadius: 56,
    marginTop: 26,
  },
  logo: {
    color: '#61DAFB',
    fontSize: 76,
    lineHeight: 92,
  },
  accessBadge: {
    alignSelf: 'center',
    overflow: 'hidden',
    color: '#CED6DF',
    backgroundColor: '#14201F',
    borderColor: '#28544A',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  form: {
    marginTop: 24,
  },
  input: {
    minHeight: 54,
    color: '#F0F6FC',
    backgroundColor: '#161B22',
    borderColor: '#388BFD',
    borderRadius: 9,
    borderWidth: 1.5,
    fontSize: 15,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#58A6FF',
    borderRadius: 5,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.78,
  },
  disabledButton: {
    opacity: 0.5,
  },
  storageError: {
    color: '#FF7B72',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  cancelEditButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelEditText: {
    color: '#A7B1BC',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#122622',
    borderColor: '#28544A',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 12,
  },
  suggestionButtonText: {
    color: '#9ED6B0',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsPanel: {
    backgroundColor: '#101C1A',
    borderColor: '#28544A',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  suggestionsTitle: {
    color: '#C9D1D9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#172B27',
    borderColor: '#315C50',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionChipText: {
    color: '#C4E6D0',
    fontSize: 12,
    fontWeight: '600',
  },
  adminCard: {
    minHeight: 88,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#161B22',
    borderRadius: 12,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  adminCopy: {
    flex: 1,
    paddingRight: 12,
  },
  adminTitle: {
    color: '#F0F3F6',
    fontSize: 16,
    fontWeight: '600',
  },
  adminDescription: {
    color: '#919BA6',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  credentialsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 28,
  },
  credentialsTitle: {
    color: '#F0F3F6',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  credentialsCount: {
    minWidth: 26,
    overflow: 'hidden',
    color: '#B9C5D0',
    backgroundColor: '#1B2928',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#101C1A',
    borderColor: '#263B37',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    color: '#CFD8D5',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDescription: {
    color: '#899590',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  credentialCard: {
    minHeight: 68,
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#101C1A',
    borderColor: '#263B37',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  credentialAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17352E',
    borderRadius: 19,
    marginRight: 11,
  },
  avatarText: {
    color: '#82D49A',
    fontSize: 17,
    fontWeight: '700',
  },
  credentialInfo: {
    flex: 1,
    paddingRight: 8,
  },
  credentialName: {
    color: '#EDF3F1',
    fontSize: 14,
    fontWeight: '600',
  },
  credentialAccess: {
    color: '#87958F',
    fontSize: 11,
    marginTop: 3,
  },
  rowActions: {
    alignItems: 'flex-end',
  },
  rowAction: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  editAction: {
    color: '#79C0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  removeAction: {
    color: '#FF7B72',
    fontSize: 12,
    fontWeight: '600',
  },
  lockedLabel: {
    fontSize: 16,
    paddingHorizontal: 6,
  },
  footer: {
    color: '#65746E',
    fontSize: 11,
    marginTop: 22,
    textAlign: 'center',
  },
});
