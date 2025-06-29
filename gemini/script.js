document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');
    const modelSelect = document.getElementById('model-select');
    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const fileUploadInput = document.getElementById('file-upload-input');
    const exportHistoryBtn = document.getElementById('export-history-btn');
    const importHistoryInput = document.getElementById('import-history-input');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const selectMessagesBtn = document.getElementById('select-messages-btn');
    const selectionToolbar = document.getElementById('selection-toolbar');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');

    // --- State Management ---
    let chatHistory = []; // Stores conversation history for API calls
    let imagesToSend = []; // Stores Base64 encoded images for the next message
    let isSelectionMode = false; // Flag for message selection mode
    let messageIdCounter = 0; // Simple counter for unique message IDs

    // --- Settings & Theme ---
    const saveSettings = () => {
        localStorage.setItem('gemini-api-key', apiKeyInput.value);
        localStorage.setItem('gemini-base-url', baseUrlInput.value);
        localStorage.setItem('gemini-model', modelSelect.value); // Save selected model
        alert('设置已保存！');
        toggleSettingsPanel();
    };

    const loadSettings = () => {
        const apiKey = localStorage.getItem('gemini-api-key') || 'AIzaSyCa_MAdz1LsTOBFG0oW5LuIRiwfforFiu8';
        const baseUrl = localStorage.getItem('gemini-base-url') || 'https://api-proxy.me/gemini';
        apiKeyInput.value = apiKey;
        baseUrlInput.value = baseUrl;
        // We'll apply the saved model after fetching the list
    };

    const applyTheme = (theme) => {
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme);
    };

    const toggleTheme = () => {
        const currentTheme = document.body.dataset.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    const toggleSettingsPanel = () => {
        settingsPanel.classList.toggle('hidden');
    };

    // --- API Communication ---
    const fetchModels = async () => {
        const apiKey = apiKeyInput.value;
        const baseUrl = baseUrlInput.value;
        if (!apiKey || !baseUrl) {
            modelSelect.innerHTML = '<option value="">请先完成设置</option>';
            return;
        }
        const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models?key=${apiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP 错误! 状态: ${response.status}`);
            const data = await response.json();
            modelSelect.innerHTML = '';
            data.models.forEach(model => {
                if (model.supportedGenerationMethods.includes('generateContent')) {
                    const option = document.createElement('option');
                    const displayName = model.name.split('/').pop();
                    option.value = displayName;
                    option.textContent = displayName;
                    modelSelect.appendChild(option);
                }
            });
            // After populating, try to set the saved model, with a fallback to the new default
            const savedModel = localStorage.getItem('gemini-model') || 'gemini-2.5-pro';
            if (savedModel) {
                // Check if the saved model exists in the list before setting it
                const modelExists = Array.from(modelSelect.options).some(option => option.value === savedModel);
                if (modelExists) {
                    modelSelect.value = savedModel;
                }
            }
        } catch (error) {
            console.error('获取模型列表失败:', error);
            modelSelect.innerHTML = '<option value="">获取模型失败</option>';
            alert(`无法获取模型列表: ${error.message}`);
        }
    };

    const streamGenerateContent = async () => {
        const apiKey = apiKeyInput.value;
        const baseUrl = baseUrlInput.value;
        const selectedModel = modelSelect.value;
        if (!apiKey || !baseUrl || !selectedModel) {
            alert('请在设置中填写 API Key, Base URL 并选择一个模型。');
            return;
        }
        const url = `${baseUrl.replace(/\/$/, '')}/v1beta/models/${selectedModel}:streamGenerateContent?key=${apiKey}&alt=sse`;
        
        const thinkingElement = addMessage('ai', [{ text: '思考中...' }], -1); // Temporary message
        let aiMessageElement;
        let fullResponse = "";

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: chatHistory.map(({id, ...rest}) => rest) }) // Exclude id from history
            });
            if (!response.body) throw new Error('响应体不存在');

            thinkingElement.remove();
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            const text = data.candidates[0]?.content?.parts[0]?.text;
                            if (text) {
                                if (!aiMessageElement) {
                                    messageIdCounter++;
                                    aiMessageElement = addMessage('ai', [{ text: '' }], messageIdCounter);
                                    chatHistory.push({ id: messageIdCounter, role: 'model', parts: [{ text: '' }] });
                                }
                                fullResponse += text;
                                chatHistory[chatHistory.length - 1].parts[0].text = fullResponse;
                                aiMessageElement.innerHTML = marked.parse(fullResponse);
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            }
                        } catch (e) { /* Ignore incomplete JSON */ }
                    }
                }
            }
        } catch (error) {
            console.error('流式传输错误:', error);
            if (aiMessageElement) aiMessageElement.innerHTML = `出现错误: ${error.message}`;
            else thinkingElement.innerHTML = `出现错误: ${error.message}`;
        }
    };

    // --- UI & Message Handling ---
    const addMessage = (sender, parts, messageId) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.dataset.messageId = messageId;

        parts.forEach(part => {
            if (part.text) {
                const textElement = document.createElement('div');
                textElement.innerHTML = marked.parse(part.text);
                messageElement.appendChild(textElement);
            } else if (part.inline_data) {
                const img = document.createElement('img');
                img.src = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
                messageElement.appendChild(img);
            }
        });

        messageElement.addEventListener('click', () => {
            if (isSelectionMode) messageElement.classList.toggle('selected');
        });
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageElement;
    };

    const handleSendMessage = async () => {
        const prompt = messageInput.value.trim();
        if (!prompt && imagesToSend.length === 0) return;

        const userParts = [];
        if (prompt) userParts.push({ text: prompt });
        imagesToSend.forEach(img => {
            userParts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
        });
        
        messageIdCounter++;
        addMessage('user', userParts, messageIdCounter);
        chatHistory.push({ id: messageIdCounter, role: 'user', parts: userParts });
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        document.getElementById('image-preview-container')?.remove();
        imagesToSend = [];

        await streamGenerateContent();
    };

    // --- Image Handling ---
    const handleFiles = (files) => {
        if (!files || files.length === 0) return;
        const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));
        if (!imageFile) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagesToSend.push({ base64: e.target.result.split(',')[1], mimeType: imageFile.type });
            displayImagePreview();
        };
        reader.readAsDataURL(imageFile);
    };

    const displayImagePreview = () => {
        let previewContainer = document.getElementById('image-preview-container');
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'image-preview-container';
            // Insert before the input area within the footer
            const inputArea = document.querySelector('.input-area');
            inputArea.parentNode.insertBefore(previewContainer, inputArea);
        }
        previewContainer.innerHTML = '';
        imagesToSend.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-wrapper';
            const imgElement = document.createElement('img');
            imgElement.src = `data:${img.mimeType};base64,${img.base64}`;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => {
                imagesToSend.splice(index, 1);
                displayImagePreview();
            };
            wrapper.appendChild(imgElement);
            wrapper.appendChild(removeBtn);
            previewContainer.appendChild(wrapper);
        });
        if (imagesToSend.length === 0) previewContainer.remove();
    };

    // --- History Management ---
    const exportHistory = () => {
        if (chatHistory.length === 0) return alert('没有聊天记录可导出。');
        const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gemini-chat-history-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importHistory = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedHistory = JSON.parse(e.target.result);
                if (!Array.isArray(importedHistory)) throw new Error('无效的格式。');
                chatContainer.innerHTML = '';
                chatHistory = importedHistory;
                messageIdCounter = Math.max(...importedHistory.map(m => m.id), 0);
                chatHistory.forEach(item => addMessage(item.role === 'user' ? 'user' : 'ai', item.parts, item.id));
                alert('聊天记录导入成功！');
            } catch (error) {
                alert(`导入失败: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const clearChat = () => {
        if (confirm('你确定要清空所有聊天记录吗？')) {
            chatContainer.innerHTML = '';
            chatHistory = [];
            imagesToSend = [];
            messageIdCounter = 0;
            document.getElementById('image-preview-container')?.remove();
        }
    };

    // --- Message Selection & Deletion ---
    const toggleSelectionMode = () => {
        isSelectionMode = !isSelectionMode;
        document.body.classList.toggle('selection-mode', isSelectionMode);
        selectionToolbar.classList.toggle('hidden', !isSelectionMode);
        if (!isSelectionMode) {
            document.querySelectorAll('.message.selected').forEach(el => el.classList.remove('selected'));
        }
    };

    const deleteSelectedMessages = () => {
        const selectedElements = document.querySelectorAll('.message.selected');
        if (selectedElements.length === 0) return alert('请先选择要删除的消息。');
        if (confirm(`你确定要删除选中的 ${selectedElements.length} 条消息吗？`)) {
            const idsToDelete = new Set();
            selectedElements.forEach(el => {
                idsToDelete.add(parseInt(el.dataset.messageId, 10));
                el.remove();
            });
            chatHistory = chatHistory.filter(msg => !idsToDelete.has(msg.id));
            toggleSelectionMode();
        }
    };

    // --- Event Listeners ---
    const setupEventListeners = () => {
        settingsBtn.addEventListener('click', toggleSettingsPanel);
        saveSettingsBtn.addEventListener('click', saveSettings);
        themeToggleBtn.addEventListener('click', toggleTheme);
        fetchModelsBtn.addEventListener('click', fetchModels);
        sendBtn.addEventListener('click', handleSendMessage);
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = `${messageInput.scrollHeight}px`;
        });
        fileUploadInput.addEventListener('change', (e) => handleFiles(e.target.files));
        document.addEventListener('paste', (e) => handleFiles(e.clipboardData.files));
        exportHistoryBtn.addEventListener('click', exportHistory);
        importHistoryInput.addEventListener('change', importHistory);
        clearChatBtn.addEventListener('click', clearChat);
        selectMessagesBtn.addEventListener('click', toggleSelectionMode);
        deleteSelectedBtn.addEventListener('click', deleteSelectedMessages);
    };

    // --- Initialization ---
    const init = () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
        loadSettings();
        fetchModels();
        setupEventListeners();
    };

    init();
});