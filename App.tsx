import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Appearance,
  ActivityIndicator,
  Keyboard
} from "react-native";
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo icons
import { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';

export default function App() {
  interface Message {
    id: number;
    text: string;
    isUser: boolean;
    isError?: boolean;
    timestamp?: Date;
  }

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  const scrollViewRef = useRef<ScrollView>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [inputHeight, setInputHeight] = useState(40);


  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCursorVisible(v => !v);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

 // Add this effect to handle autoscrolling specifically for model responses
useEffect(() => {
  // Only scroll if there are messages and the last message is from the bot (not user)
  if (messages.length > 0 && !messages[messages.length - 1].isUser) {
    // Scroll immediately
    scrollViewRef.current?.scrollToEnd({ animated: true });
    
    // Also scroll after a short delay to ensure content has rendered completely
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [messages, messages.length > 0 ? messages[messages.length - 1].text : '']);

  // Additional effect for streaming content scrolling
  useEffect(() => {
    // This will trigger scrolling when the last message's text changes
    if (messages.length > 0 && !messages[messages.length - 1].isUser) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length > 0 ? messages[messages.length - 1].text : null]);

  const theme = {
    backgroundColor: isDarkMode ? '#121212' : '#f5f5f7',
    textColor: isDarkMode ? '#e0e0e0' : '#333333',
    secondaryTextColor: isDarkMode ? '#a0a0a0' : '#777777',
    cardColor: isDarkMode ? '#1e1e1e' : '#ffffff',
    inputBackgroundColor: isDarkMode ? '#2a2a2a' : '#f0f0f0',
    borderColor: isDarkMode ? '#333333' : '#e0e0e0',
    userBubbleColor: isDarkMode ? '#0056b3' : '#007AFF',
    botBubbleColor: isDarkMode ? '#2c2c2e' : '#E5E5EA',
    botTextColor: isDarkMode ? '#e0e0e0' : '#000000',
    loadingBubbleColor: isDarkMode ? '#2c2c2e' : '#E5E5EA',
    loadingTextColor: isDarkMode ? '#a0a0a0' : '#6b6b6b',
    placeholderColor: isDarkMode ? '#666666' : '#a0a0a0',
    iconColor: isDarkMode ? '#e0e0e0' : '#007AFF',
    timestampColor: isDarkMode ? '#777777' : '#999999',
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    Keyboard.dismiss();

    const userMessage = {
      id: Date.now(),
      text: prompt,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    setPrompt("");
    setInputHeight(40);


    try {
      const response = await fetch("http://127.0.0.1:8000/api/ask/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = {
        id: Date.now() + 1,
        text: "",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        botMessage.text += chunk;
        setMessages(prevMessages =>
          prevMessages.map(msg => msg.id === botMessage.id ? botMessage : msg)
        );
      }
    } catch (error) {
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now() + 1,
        text: "Error: Unable to process request. Please check your connection and try again.",
        isUser: false,
        isError: true,
        timestamp: new Date()
      }]);
      console.error("Error fetching response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      // Note: React Native doesn't support shiftKey in the same way as web browsers
      
      // Only send if there's text and we're not already loading
      if (prompt.trim() && !isLoading) {
        handleSend();
      }
      
      // Return true to indicate we've handled the key press
      return true;
    }
    return false;
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.backgroundColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.header, { backgroundColor: theme.cardColor, borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.title, { color: theme.textColor }]}>Ollama Chat</Text>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Ionicons
              name={isDarkMode ? "sunny-outline" : "moon-outline"}
              size={24}
              color={theme.iconColor}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent
          ]}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={50} color={theme.secondaryTextColor} />
              <Text style={[styles.emptyStateText, { color: theme.textColor }]}>
                Start a conversation with Ollama
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.secondaryTextColor }]}>
                Ask a question or request information...
              </Text>
              <View style={styles.exampleContainer}>
                <Text style={[styles.exampleHeader, { color: theme.textColor }]}>Try asking:</Text>
                {[
                  "Explain quantum computing",
                  "Write a short poem about AI",
                  "How do I create a React app?"
                ].map((example, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.exampleButton, { borderColor: theme.borderColor }]}
                    onPress={() => {
                      setPrompt(example);
                    }}
                  >
                    <Text style={[styles.exampleText, { color: theme.textColor }]}>{example}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map((message) => (
              <View key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isUser ? styles.userMessageWrapper : styles.botMessageWrapper
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser
                      ? [styles.userBubble, { backgroundColor: theme.userBubbleColor }]
                      : message.isError
                        ? [styles.botBubble, styles.errorBubble]
                        : [styles.botBubble, { backgroundColor: theme.botBubbleColor }]
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser
                        ? styles.userText
                        : message.isError
                          ? styles.errorText
                          : { color: theme.botTextColor }
                    ]}
                  >
                    {message.text}
                    {isLoading && message === messages[messages.length - 1] && !message.isUser &&
                      <Text style={{ opacity: cursorVisible ? 1 : 0 }}>|</Text>
                    }
                  </Text>
                </View>


                <Text
                  style={[
                    styles.timestamp,
                    { color: theme.timestampColor },
                    message.isUser ? styles.userTimestamp : styles.botTimestamp
                  ]}
                >
                  {formatTimestamp(message.timestamp)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: theme.cardColor, borderTopColor: theme.borderColor }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackgroundColor,
                color: theme.textColor,
                minHeight: 40,
                maxHeight: 80,
              }
            ]}
            placeholder="Ask something..."
            value={prompt}
            onChangeText={setPrompt}
            multiline
            onKeyPress={handleKeyPress} // Add this line
            onContentSizeChange={(e) => {
              setInputHeight(e.nativeEvent.contentSize.height);
            }}
            placeholderTextColor={theme.placeholderColor}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !prompt.trim() && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  themeToggle: {
    position: 'absolute',
    right: 16,
    padding: 6
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16
  },
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: "85%",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end"
  },
  botMessageWrapper: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-end"
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    maxWidth: "80%", // Keeps bubbles from being too wide
    backgroundColor: "#E5E5EA",
    flexShrink: 1, // Ensures text wraps properly
  },

  errorBubble: {
    backgroundColor: "#ffebee"
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  userText: {
    color: "#ffffff"
  },
  errorText: {
    color: "#d32f2f"
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    alignSelf: "flex-end",
    marginRight: 4
  },
  botTimestamp: {
    marginLeft: 8
  },
  loadingContainer: {
    alignItems: "flex-start",
    marginBottom: 10
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 4
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    paddingRight: 40,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center"
  },
  sendButtonDisabled: {
    backgroundColor: "#b0b0b0"
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center"
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30
  },
  exampleContainer: {
    width: '100%',
    alignItems: 'center'
  },
  exampleHeader: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  exampleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    width: '90%'
  },
  exampleText: {
    fontSize: 14,
    textAlign: 'left'
  }
});