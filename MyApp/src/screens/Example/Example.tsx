/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { htmlString, htmlString2 } from '@/util';

// Import HTML from assets
const formHTML = require('../assets/form.html');

const STORAGE_KEYS = {
  FORM_DATA: '@form_data',
  PENDING_SUBMISSIONS: '@pending_submissions',
  LAST_SYNC: '@last_sync',
};

interface FormData {
  [key: string]: any;
}

interface PendingSubmission {
  id: string;
  formId: string;
  data: FormData;
  timestamp: number;
}

const API_BASE_URL = 'http://192.168.1.11:3000';

const Example: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const [htmlContent, setHtmlContent] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const webViewRef = useRef<WebView>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadHTMLContent();
    setupNetworkListener();
    setupAppStateListener();
    loadLastSyncTime();
    checkPendingSubmissions();
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      setDebugInfo(`Testing: ${API_BASE_URL}/api/health`);

      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
      } else {
        setDebugInfo(`Backend error: ${response.status}`);
      }
    } catch (error) {
      setDebugInfo(`Cannot connect to ${API_BASE_URL}`);

      Alert.alert(
        'Backend Connection Failed',
        `Cannot connect to:\n${API_BASE_URL}\n\n` +
          `Please check:\n` +
          `1. Backend is running (node server.js)\n` +
          `2. IP address is correct\n` +
          `3. Phone and computer on same WiFi\n\n` +
          [{ text: 'OK' }],
      );
    }
  };

  const loadHTMLContent = async () => {
    try {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Registration Form</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .form-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .form-group {
            margin-bottom: 16px;
        }
        label {
            display: block;
            margin-bottom: 6px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        .required {
            color: #FF5252;
        }
        input, textarea, select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            background-color: #fafafa;
        }
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        input:focus, textarea:focus, select:focus {
            outline: none;
            border-color: #2196F3;
            background-color: white;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        button {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            color: white;
        }
        .btn-save {
            background-color: #2196F3;
        }
        .btn-submit {
            background-color: #4CAF50;
        }
        button:active {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>User Registration Form</h1>
        <form id="mainForm">
            <div class="form-group">
                <label for="firstName">First Name <span class="required">*</span></label>
                <input type="text" id="firstName" name="firstName" required>
            </div>

            <div class="form-group">
                <label for="lastName">Last Name <span class="required">*</span></label>
                <input type="text" id="lastName" name="lastName" required>
            </div>

            <div class="form-group">
                <label for="email">Email <span class="required">*</span></label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone">
            </div>

            <div class="form-group">
                <label for="address">Address</label>
                <textarea id="address" name="address"></textarea>
            </div>

            <div class="form-group">
                <label for="city">City <span class="required">*</span></label>
                <input type="text" id="city" name="city" required>
            </div>

            <div class="form-group">
                <label for="state">State</label>
                <input type="text" id="state" name="state">
            </div>

            <div class="form-group">
                <label for="zipCode">ZIP Code</label>
                <input type="text" id="zipCode" name="zipCode">
            </div>

            <div class="form-group">
                <label for="country">Country <span class="required">*</span></label>
                <select id="country" name="country" required>
                    <option value="">Select Country</option>
                    <option value="us">United States</option>
                    <option value="in">India</option>
                    <option value="uk">United Kingdom</option>
                    <option value="ca">Canada</option>
                    <option value="au">Australia</option>
                </select>
            </div>

            <div class="button-group">
                <button type="button" class="btn-save" onclick="saveForm()">Save Draft</button>
                <button type="button" class="btn-submit" onclick="submitForm()">Submit</button>
            </div>
        </form>
    </div>

    <script>
        let autoSaveTimeout;

        // Get form data
        function getFormData() {
            const form = document.getElementById('mainForm');
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            return data;
        }

        // Set form data
        function setFormData(data) {
            if (!data) return;
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    element.value = data[key] || '';
                }
            });
        }

        // Auto-save on input change
        document.getElementById('mainForm').addEventListener('input', function() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                const data = getFormData();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'AUTO_SAVE',
                    data: data
                }));
            }, 3000);
        });

        // Manual save
        function saveForm() {
            const data = getFormData();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MANUAL_SAVE',
                data: data
            }));
        }

        // Submit form
        function submitForm() {
            const form = document.getElementById('mainForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const data = getFormData();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SUBMIT',
                data: data
            }));
        }

        // Load saved data - this will be called from React Native
        function loadSavedData(savedData) {
            setFormData(savedData);
        }

        // Clear form
        function clearForm() {
            document.getElementById('mainForm').reset();
        }

        // Notify React Native that page is loaded
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAGE_LOADED'
        }));
    </script>
</body>
</html>
      `;
      setHtmlContent(htmlString);
      // setHtmlContent(htmlString2)
    } catch (error) {
      console.error('Error loading HTML:', error);
    }
  };

  // Network listener
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnline;
      const isNowOnline = state.isConnected ?? false;

      setIsOnline(isNowOnline);

      if (wasOffline && isNowOnline) {
        syncPendingSubmissions();
      }
    });

    return unsubscribe;
  };

  // App state listener
  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          NetInfo.fetch().then((state) => {
            if (state.isConnected) {
              syncPendingSubmissions();
            }
          });
        }
        appState.current = nextAppState;
      },
    );

    return () => subscription.remove();
  };

  // Load saved form data
  const loadFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEYS.FORM_DATA);
      if (savedData && webViewRef.current) {
        const data = JSON.parse(savedData);
        // Inject saved data into WebView
        webViewRef.current.injectJavaScript(`
          loadSavedData(${JSON.stringify(data)});
          true;
        `);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  // Save form data to AsyncStorage
  const saveFormData = async (data: FormData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  // Load last sync time
  const loadLastSyncTime = async () => {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        setLastSyncTime(new Date(parseInt(lastSync)).toLocaleString());
      }
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };

  // Check pending submissions count
  const checkPendingSubmissions = async () => {
    try {
      const pending = await AsyncStorage.getItem(
        STORAGE_KEYS.PENDING_SUBMISSIONS,
      );
      if (pending) {
        const submissions: PendingSubmission[] = JSON.parse(pending);
        setPendingCount(submissions.length);
      }
    } catch (error) {
      console.error('Error checking pending submissions:', error);
    }
  };

  // Handle messages from WebView
  const handleWebViewMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'PAGE_LOADED':
          loadFormData();
          break;

        case 'AUTO_SAVE':
          await saveFormData(message.data);
          break;

        case 'MANUAL_SAVE':
          await saveFormData(message.data);
          Alert.alert('Success', 'Form data saved locally');
          break;

        case 'SUBMIT':
          await handleSubmit(message.data);
          break;

        case 'FORM_ERROR':
          console.error('Form error:', message.error);
          Alert.alert('Form Error', message.error);
          break;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const handleSubmit = async (data: FormData) => {
    const submission: PendingSubmission = {
      id: Date.now().toString(),
      formId: 'user-registration-form',
      data: data,
      timestamp: Date.now(),
    };

    try {
      const pending = await AsyncStorage.getItem(
        STORAGE_KEYS.PENDING_SUBMISSIONS,
      );
      const submissions: PendingSubmission[] = pending
        ? JSON.parse(pending)
        : [];

      submissions.push(submission);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_SUBMISSIONS,
        JSON.stringify(submissions),
      );

      // Clear form in WebView
      webViewRef.current?.injectJavaScript(`
        clearForm();
        true;
      `);

      // Clear saved draft
      await AsyncStorage.removeItem(STORAGE_KEYS.FORM_DATA);

      Alert.alert(
        'Submitted',
        isOnline
          ? 'Form submitted and will be synced'
          : 'Form saved. Will sync when online',
      );

      setPendingCount(submissions.length);

      if (isOnline) {
        syncPendingSubmissions();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit form');
    }
  };

  // Sync pending submissions
  const syncPendingSubmissions = async () => {
    if (isSyncing) return;

    setIsSyncing(true);

    try {
      const pending = await AsyncStorage.getItem(
        STORAGE_KEYS.PENDING_SUBMISSIONS,
      );
      if (!pending) {
        setIsSyncing(false);
        return;
      }

      const submissions: PendingSubmission[] = JSON.parse(pending);
      if (submissions.length === 0) {
        setIsSyncing(false);
        return;
      }

      const syncedIds = await mockApiSync(submissions);

      const remainingSubmissions = submissions.filter(
        (sub) => !syncedIds.includes(sub.id),
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_SUBMISSIONS,
        JSON.stringify(remainingSubmissions),
      );

      const now = Date.now().toString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
      setLastSyncTime(new Date(parseInt(now)).toLocaleString());

      setPendingCount(remainingSubmissions.length);
    } catch (error) {
      console.error('Error syncing submissions:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const mockApiSync = async (
    submissions: PendingSubmission[],
  ): Promise<string[]> => {
    try {
      const API_URL = `${API_BASE_URL}/api/zoho-forms/sync`;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissions }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Sync response:', result);

      return result.syncedIds || [];
    } catch (error) {
      console.error('API sync failed:', error);
      return [];
    }
  };

  // Manual sync
  const handleManualSync = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }
    syncPendingSubmissions();
  };

  // Sync on mount if online
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        console.log('App opened with internet - syncing...');
        syncPendingSubmissions();
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Network Status Indicator */}
      <View
        style={[
          styles.statusBar,
          { backgroundColor: isOnline ? '#4CAF50' : '#FF5252' },
        ]}
      >
        <Text style={styles.statusText}>
          {isOnline ? '● Online' : '● Offline'}
        </Text>
        {pendingCount > 0 && (
          <Text style={styles.statusText}>{pendingCount} pending</Text>
        )}
        {isSyncing && <Text style={styles.statusText}>Syncing...</Text>}
      </View>

      {/* {debugInfo && (
        <View style={styles.debugBar}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )} */}

      {lastSyncTime && (
        <View style={styles.syncInfo}>
          <Text style={styles.syncText}>Last sync: {lastSyncTime}</Text>
        </View>
      )}

      {htmlContent && (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webview}
        />
      )}

      {pendingCount > 0 && (
        <TouchableOpacity
          style={[styles.syncButton, !isOnline && styles.disabledButton]}
          onPress={handleManualSync}
          disabled={!isOnline || isSyncing}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncInfo: {
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  syncText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugBar: {
    backgroundColor: '#FFF9C4',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FBC02D',
  },
  debugText: {
    fontSize: 11,
    color: '#F57F17',
    textAlign: 'center',
  },
});

export default Example;
