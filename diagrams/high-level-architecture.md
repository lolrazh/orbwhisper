```mermaid
graph TB
    User[User]
    subgraph "Electron Desktop App"
        MainProcess[Main Process]
        RendererProcess[Renderer Process]
        
        subgraph "Core Components"
            WhisperAPI[Whisper API Module]
            KeyboardSim[Keyboard Simulation Module]
            Settings[Settings Module]
        end
        
        subgraph "UI Components"
            BubbleUI[Floating Bubble UI]
            FrequencyBars[Frequency Visualization]
            ConfigUI[Configuration UI]
        end
    end
    
    OpenAI[OpenAI Whisper API]
    OS[Operating System]
    
    User -->|Interacts with| BubbleUI
    User -->|Speaks into Microphone| RendererProcess
    User -->|Uses Hotkey| OS
    
    OS -->|Hotkey Events| MainProcess
    MainProcess -->|IPC| RendererProcess
    RendererProcess -->|IPC| MainProcess
    
    RendererProcess -->|Controls| BubbleUI
    RendererProcess -->|Updates| FrequencyBars
    RendererProcess -->|Shows| ConfigUI
    
    MainProcess -->|Uses| WhisperAPI
    MainProcess -->|Uses| KeyboardSim
    MainProcess -->|Uses| Settings
    
    WhisperAPI -->|Transcription Requests| OpenAI
    OpenAI -->|Transcribed Text| WhisperAPI
    
    KeyboardSim -->|Pastes Text| OS
    Settings -->|Loads/Saves| OS
    
    style MainProcess fill:#f9f,stroke:#333,stroke-width:2px
    style RendererProcess fill:#bbf,stroke:#333,stroke-width:2px
    style WhisperAPI fill:#bfb,stroke:#333,stroke-width:1px
    style KeyboardSim fill:#bfb,stroke:#333,stroke-width:1px
    style Settings fill:#bfb,stroke:#333,stroke-width:1px
    style BubbleUI fill:#fbb,stroke:#333,stroke-width:1px
    style FrequencyBars fill:#fbb,stroke:#333,stroke-width:1px
    style ConfigUI fill:#fbb,stroke:#333,stroke-width:1px
    ```