import type { NativeObsidianSignalKey } from "../integration/native-events";
import type { BubbleStyle, PetLanguage } from "./settings";
import type { PetActionAnimationId } from "./animation";
import type { CompanionEventType } from "./events";

export const SETTINGS_SECTION_IDS = [
  "window",
  "pet",
  "import",
  "behavior",
  "speech",
  "integrations",
  "about"
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export type PetUiStrings = {
  contextMenuAria: string;
  openSettings: string;
  wave: string;
  pauseWalking: string;
  roam: string;
  hidePet: string;
  clickBubble: string;
  waveBubble: string;
};

export const PET_UI_STRINGS_BY_LANGUAGE: Record<PetLanguage, PetUiStrings> = {
  en: {
    contextMenuAria: "Petsidian pet actions",
    openSettings: "Open settings",
    wave: "Wave",
    pauseWalking: "Pause walking",
    roam: "Let me roam",
    hidePet: "Hide pet",
    clickBubble: "Hi from Petsidian!",
    waveBubble: "Hello from Petsidian!"
  },
  "zh-CN": {
    contextMenuAria: "宠物操作",
    openSettings: "打开设置",
    wave: "挥手",
    pauseWalking: "暂停移动",
    roam: "自由移动",
    hidePet: "隐藏宠物",
    clickBubble: "Petsidian 来啦！",
    waveBubble: "Petsidian 来啦！"
  }
};

const EN_SETTINGS_UI = {
  title: "Petsidian",
  intro:
    "Manage the detached desktop pet window for Obsidian.",
  importedSuffix: "imported",
  sections: {
    window: {
      label: "Window",
      description:
        "Show or hide the detached pet, tune desktop-window behavior, and switch UI language."
    },
    pet: {
      label: "Pet",
      description: "Choose the bundled or imported pet and manage imported entries."
    },
    import: {
      label: "Import",
      description: "Import from local files or supported websites."
    },
    behavior: {
      label: "Behavior",
      description: "Adjust motion, click actions, and companion reactions."
    },
    speech: {
      label: "Bubble",
      description: "Control bubble visibility and appearance."
    },
    integrations: {
      label: "Integrations",
      description: "Control the API, URI handler, and native Obsidian events."
    },
    about: {
      label: "About",
      description: "View links, credits, and release notes."
    }
  },
  common: {
    preview: "Preview",
    trigger: "Trigger",
    use: "Use",
    remove: "Remove",
    import: "Import",
    browse: "Browse",
    noImportedPets:
      "No imported pets yet. Use the Import section to add a Codex pet package, atlas, or static image.",
    importedPetsStorage: "Imported pets are stored under this plugin's data folder so they survive reloads.",
    debounceLabel: "Debounce",
    milliseconds: "ms",
    selectedSourceLabel: "Selected source",
    noSourceSelected: "No local source selected yet.",
    supportedSourcesLabel: "Supported sources:"
  },
  notices: {
    activePetSetPrefix: "Active pet set to ",
    localPathRequired: "Enter or choose a local pet path first.",
    websiteUrlRequired: "Paste a supported pet page URL first."
  },
  window: {
    heading: "Window",
    showPetName: "Show pet",
    showPetDesc: "Create or show the detached transparent desktop pet window.",
    alwaysOnTopName: "Always on top",
    alwaysOnTopDesc: "Keep the pet window above normal desktop windows.",
    skipTaskbarName: "Skip taskbar",
    skipTaskbarDesc:
      "Hide the pet window from the operating-system taskbar or dock when Electron supports it.",
    languageName: "Language",
    languageDesc:
      "Use English or Simplified Chinese for detached-pet labels, menus, and click bubbles.",
    languageEnglish: "English",
    languageChinese: "Simplified Chinese"
  },
  pet: {
    heading: "Pet catalog",
    activePetName: "Active pet",
    activePetDesc: "Choose the bundled or imported pet."
  },
  import: {
    heading: "Import",
    intro: "Choose one source and import the pet you want to use.",
    petdex: "Petdex",
    codexPets: "Codex Pets",
    localTitle: "Local import",
    localCopy: "Import a package, manifest, atlas, or static image from your device.",
    localSourceName: "Local import path",
    localSourceDesc: "Supports package folders, pet.json, Codex pet atlas .webp, or one static image.",
    localSourcePlaceholder: "C:\\Users\\you\\Pets\\sample\\pet.json",
    localAcceptedTitle: "Accepted local sources",
    localAcceptedList: [
      "Codex pet package directory or pet.json manifest",
      "Codex pet atlas .webp file",
      "Single-image .png, .jpg, .jpeg, .gif, or .webp source"
    ],
    websiteTitle: "Web import",
    websiteCopy: "Paste a supported HTTPS pet page URL.",
    websiteSourceName: "Website import URL",
    websiteSourceDesc: "Supports Petdex, Codex Pets, and compatible HTTPS pages.",
    websiteSourcePlaceholder: "https://petdex.crafter.run/pets/boba",
    compatibilityTitle: "Compatibility notes",
    compatibilityCopy: "Petsidian keeps the same import formats and safety checks.",
    compatibilityNotes: [
      "Standalone .webp files keep direct atlas import when they already match the Codex pet atlas size.",
      "Other supported static images are converted into a compatible 8×9 WebP atlas automatically.",
      "Website import stays HTTPS-only and blocks localhost or private-network targets."
    ]
  },
  behavior: {
    heading: "Behavior",
    scaleName: "Scale",
    scaleDesc: "Adjust the rendered pet size.",
    reducedMotionName: "Reduced motion",
    reducedMotionDesc: "Show stiller animation and disable autonomous walking.",
    autonomousWalkingName: "Autonomous walking",
    autonomousWalkingDesc:
      "Move the detached pet window horizontally within the primary display work area.",
    walkingSpeedName: "Walking speed",
    walkingSpeedDesc: "Horizontal movement speed in pixels per second.",
    hoverPauseName: "Pause on hover",
    hoverPauseDesc: "Pause autonomous walking while the cursor is over the pet.",
    idleSelfPlayName: "Idle self-play",
    idleSelfPlayDesc: "After a quiet period, reuse action animations for small autonomous moments.",
    idleThresholdName: "Idle threshold",
    idleThresholdDesc: "How long the pet waits before self-play can start.",
    idleActionFrequencyName: "Idle action frequency",
    idleActionFrequencyDesc: "Minimum spacing between idle self-play actions.",
    idleActionName: "Idle action",
    idleActionDesc: "Choose a specific idle action or reuse the click/random action pool.",
    idleRandom: "Surprise me",
    idleActiveAction: "Use click action",
    clickActionModeName: "Click action mode",
    clickActionModeDesc: "Use one fixed action or pick from the random action pool.",
    clickActionModeFixed: "Fixed",
    clickActionModeRandom: "Random",
    fixedClickActionName: "Fixed click action",
    fixedClickActionDesc: "Used for fixed mode and as the random fallback.",
    randomActionPoolLabel: "Random action pool",
    randomActionPoolItemDesc: "Allow this action when click mode uses random selection.",
    eventReactionsName: "Event reactions",
    eventReactionsDesc: "Play action reactions for companion events.",
    previewCompanionEventsName: "Preview companion events",
    previewCompanionEventsDesc: "Trigger a companion event preview."
  },
  speech: {
    heading: "Bubble",
    eventBubblesName: "Event bubbles",
    eventBubblesDesc: "Show bubbles for companion events, click reactions, and previews.",
    bubbleAppearanceHeading: "Bubble appearance",
    bubbleStyleName: "Bubble style",
    bubbleStyleDesc: "Choose the detached pet bubble skin.",
    bubbleDurationName: "Bubble duration",
    bubbleDurationDesc: "How long bubbles remain visible.",
    bubbleFontFamilyName: "Bubble font family",
    bubbleFontFamilyDesc: "CSS font-family applied to the detached pet bubble.",
    bubbleFontFamilyPlaceholder: "Aptos Display",
    bubbleFontSizeName: "Bubble font size",
    bubbleFontSizeDesc: "Font size in pixels.",
    bubbleMaxWidthName: "Bubble max width",
    bubbleMaxWidthDesc: "Maximum bubble width in pixels.",
    bubblePreviewText: "Petsidian can preview your bubble style here."
  },
  integrations: {
    heading: "Integrations",
    intro: "Enable the plugin API, URI handler, or selected native Obsidian reactions.",
    apiEnabledName: "Enable plugin API",
    apiEnabledDesc:
      "Expose app.plugins.plugins.petsidian.apiV1 with safe in-process show, hide, say, action, and event helpers.",
    protocolEnabledName: "Enable petsidian URI handler",
    protocolEnabledDesc:
      "Allow obsidian://petsidian requests. Disabled by default because URI input can originate outside Obsidian.",
    protocolSayMaxLengthName: "URI speech max length",
    protocolSayMaxLengthDesc:
      "Trim obsidian://petsidian?text=... input to this many characters before showing a bubble.",
    protocolDefaultTtlName: "URI speech duration",
    protocolDefaultTtlDesc:
      "Fallback bubble duration in milliseconds for text-only URI requests when ttlMs is omitted.",
    nativeHeading: "Native Obsidian event reactions",
    nativeEnabledName: "Enable native event reactions",
    nativeEnabledDesc:
      "Listen for selected Obsidian events and route them through Petsidian's existing companion-event reactions.",
    nativeCooldownName: "Native event cooldown",
    nativeCooldownDesc:
      "Minimum spacing in milliseconds between native Obsidian reaction triggers.",
    nativeSignalsIntro:
      "Signals stay opt-in and debounced. Turn on only the reactions that feel helpful for your vault."
  },
  about: {
    heading: "About",
    notes: [
      "Imported pets are stored in this plugin's data folder, not only inside settings.",
      "Local import accepts Codex pet packages, atlases, and one static image.",
      "Web import stays HTTPS-only and blocks localhost or private-network targets."
    ],
    bundledPetPrefix: "Bundled pet: ",
    bundledPetSuffix: " from the original OpenPet Nia asset.",
    linksTitle: "Project links",
    githubLabel: "GitHub",
    githubUrl: "https://github.com/X-T-E-R/Petsidian",
    supportLabel: "Buy me a milk tea",
    supportUrl: "https://afdian.com/a/xter123",
    friendLinksTitle: "Friendly links",
    friendLinks: [
      {
        label: "OpenPet",
        href: "https://github.com/X-T-E-R/OpenPet"
      },
      {
        label: "Petdex",
        href: "https://petdex.crafter.run/"
      },
      {
        label: "Codex Pets",
        href: "https://codex-pets.net/"
      }
    ]
  }
} as const;

type DeepTextShape<T> =
  T extends string ? string
  : T extends readonly (infer U)[] ? readonly DeepTextShape<U>[]
  : T extends object ? { [K in keyof T]: DeepTextShape<T[K]> }
  : T;

export type SettingsUiStrings = DeepTextShape<typeof EN_SETTINGS_UI>;

const ZH_SETTINGS_UI = {
  title: "Petsidian",
  intro:
    "在这里管理独立桌宠窗口。",
  importedSuffix: "已导入",
  sections: {
    window: {
      label: "窗口",
      description: "控制桌宠窗口的显示状态、桌面行为和界面语言。"
    },
    pet: {
      label: "宠物",
      description: "选择内置或已导入的宠物，并管理导入列表。"
    },
    import: {
      label: "导入",
      description: "从本地文件或受支持的网站导入宠物。"
    },
    behavior: {
      label: "行为",
      description: "调整移动、点击动作和伙伴反应。"
    },
    speech: {
      label: "气泡",
      description: "控制气泡显示和外观。"
    },
    integrations: {
      label: "集成",
      description: "控制 API、URI 处理器和原生 Obsidian 事件。"
    },
    about: {
      label: "关于",
      description: "查看链接、致谢和发布信息。"
    }
  },
  common: {
    preview: "预览",
    trigger: "触发",
    use: "使用",
    remove: "移除",
    import: "导入",
    browse: "浏览",
    noImportedPets: "还没有导入宠物。去“导入”分区添加 Codex 宠物包、图集或静态图片吧。",
    importedPetsStorage: "已导入宠物会存放在这个插件的数据目录里，重载后也会保留。",
    debounceLabel: "防抖",
    milliseconds: "毫秒",
    selectedSourceLabel: "当前来源",
    noSourceSelected: "还没有选择本地来源。",
    supportedSourcesLabel: "支持的网站："
  },
  notices: {
    activePetSetPrefix: "当前宠物已切换为 ",
    localPathRequired: "请先输入或选择本地宠物路径。",
    websiteUrlRequired: "请先粘贴受支持的宠物页面 URL。"
  },
  window: {
    heading: "窗口",
    showPetName: "显示宠物",
    showPetDesc: "创建或显示独立透明桌宠窗口。",
    alwaysOnTopName: "始终置顶",
    alwaysOnTopDesc: "让宠物窗口保持在普通桌面窗口之上。",
    skipTaskbarName: "不显示在任务栏",
    skipTaskbarDesc: "在 Electron 支持时，从系统任务栏或 Dock 中隐藏宠物窗口。",
    languageName: "语言",
    languageDesc: "为桌宠标签、菜单和点击气泡选择英文或简体中文。",
    languageEnglish: "English",
    languageChinese: "简体中文"
  },
  pet: {
    heading: "宠物目录",
    activePetName: "当前宠物",
    activePetDesc: "选择内置宠物或已导入宠物。"
  },
  import: {
    heading: "导入",
    intro: "选择一种来源，然后导入你想使用的宠物。",
    petdex: "Petdex",
    codexPets: "Codex Pets",
    localTitle: "本地导入",
    localCopy: "从你的设备导入包、清单、图集或静态图片。",
    localSourceName: "本地导入路径",
    localSourceDesc: "支持包目录、pet.json、Codex 宠物图集 .webp，或单张静态图片。",
    localSourcePlaceholder: "C:\\Users\\you\\Pets\\sample\\pet.json",
    localAcceptedTitle: "支持的本地来源",
    localAcceptedList: [
      "Codex 宠物包目录或 pet.json 清单",
      "Codex 宠物图集 .webp 文件",
      "单张 .png、.jpg、.jpeg、.gif 或 .webp 图片"
    ],
    websiteTitle: "网站导入",
    websiteCopy: "粘贴受支持的 HTTPS 宠物页面 URL。",
    websiteSourceName: "网站导入 URL",
    websiteSourceDesc: "支持 Petdex、Codex Pets 和兼容的 HTTPS 页面。",
    websiteSourcePlaceholder: "https://petdex.crafter.run/pets/boba",
    compatibilityTitle: "兼容性说明",
    compatibilityCopy: "导入格式和安全检查保持不变。",
    compatibilityNotes: [
      "独立 .webp 文件如果已经符合 Codex 宠物图集尺寸，会继续直接导入。",
      "其他受支持的静态图片会自动转换成兼容的 8×9 WebP 图集。",
      "网站导入仍然只允许 HTTPS，并会拦截 localhost 或私网地址。"
    ]
  },
  behavior: {
    heading: "行为",
    scaleName: "缩放",
    scaleDesc: "调整宠物渲染尺寸。",
    reducedMotionName: "减少动效",
    reducedMotionDesc: "显示更静态的动画，并关闭自主移动。",
    autonomousWalkingName: "自主移动",
    autonomousWalkingDesc: "让独立宠物窗口在主显示器可用区域内水平移动。",
    walkingSpeedName: "移动速度",
    walkingSpeedDesc: "每秒水平移动的像素速度。",
    hoverPauseName: "悬停时暂停",
    hoverPauseDesc: "鼠标停在宠物上方时暂停自主移动。",
    idleSelfPlayName: "空闲自行动作",
    idleSelfPlayDesc: "在安静一段时间后，自动触发一些小动作。",
    idleThresholdName: "空闲阈值",
    idleThresholdDesc: "开始允许空闲动作前需要等待多久。",
    idleActionFrequencyName: "空闲动作频率",
    idleActionFrequencyDesc: "两次空闲动作之间的最小间隔。",
    idleActionName: "空闲动作",
    idleActionDesc: "选择固定空闲动作，或复用点击/随机动作池。",
    idleRandom: "给我惊喜",
    idleActiveAction: "使用点击动作",
    clickActionModeName: "点击动作模式",
    clickActionModeDesc: "固定使用一个动作，或从随机动作池里选择。",
    clickActionModeFixed: "固定",
    clickActionModeRandom: "随机",
    fixedClickActionName: "固定点击动作",
    fixedClickActionDesc: "固定模式使用它，随机模式也会把它当回退动作。",
    randomActionPoolLabel: "随机动作池",
    randomActionPoolItemDesc: "在点击随机模式下允许使用这个动作。",
    eventReactionsName: "事件动作反应",
    eventReactionsDesc: "为伙伴事件播放动作反应。",
    previewCompanionEventsName: "预览伙伴事件",
    previewCompanionEventsDesc: "触发一次伙伴事件预览。"
  },
  speech: {
    heading: "气泡",
    eventBubblesName: "事件气泡",
    eventBubblesDesc: "为伙伴事件、点击反应和预览显示气泡。",
    bubbleAppearanceHeading: "气泡外观",
    bubbleStyleName: "气泡样式",
    bubbleStyleDesc: "选择独立桌宠的气泡皮肤。",
    bubbleDurationName: "气泡持续时间",
    bubbleDurationDesc: "气泡保持可见的时长。",
    bubbleFontFamilyName: "气泡字体",
    bubbleFontFamilyDesc: "应用到桌宠气泡的 CSS font-family。",
    bubbleFontFamilyPlaceholder: "Aptos Display",
    bubbleFontSizeName: "气泡字号",
    bubbleFontSizeDesc: "字体大小（像素）。",
    bubbleMaxWidthName: "气泡最大宽度",
    bubbleMaxWidthDesc: "气泡最大宽度（像素）。",
    bubblePreviewText: "Petsidian 会在这里预览你的气泡样式。"
  },
  integrations: {
    heading: "集成",
    intro: "启用插件 API、URI 处理器或选定的原生 Obsidian 反应。",
    apiEnabledName: "启用插件 API",
    apiEnabledDesc:
      "暴露 app.plugins.plugins.petsidian.apiV1，提供安全的显示、隐藏、说话、动作和事件辅助方法。",
    protocolEnabledName: "启用 petsidian URI 处理器",
    protocolEnabledDesc: "允许 obsidian://petsidian 请求。默认关闭，因为 URI 输入可能来自 Obsidian 外部。",
    protocolSayMaxLengthName: "URI 文本最大长度",
    protocolSayMaxLengthDesc: "在显示气泡前，把 obsidian://petsidian?text=... 输入裁剪到这个长度。",
    protocolDefaultTtlName: "URI 文本持续时间",
    protocolDefaultTtlDesc: "当文本型 URI 请求未提供 ttlMs 时，使用这个默认气泡时长（毫秒）。",
    nativeHeading: "原生 Obsidian 事件反应",
    nativeEnabledName: "启用原生事件反应",
    nativeEnabledDesc: "监听选定的 Obsidian 事件，并复用 Petsidian 现有的伙伴事件反应。",
    nativeCooldownName: "原生事件冷却",
    nativeCooldownDesc: "两次原生 Obsidian 反应触发之间至少间隔多少毫秒。",
    nativeSignalsIntro: "这些信号保持按需开启并带防抖。只打开对你的仓库真正有帮助的那些即可。"
  },
  about: {
    heading: "关于",
    notes: [
      "导入宠物会存进这个插件的数据目录，而不是只塞进设置。",
      "本地导入支持 Codex 宠物包、图集和单张静态图片。",
      "网站导入仍然只允许 HTTPS，并会拦截 localhost 或私网地址。"
    ],
    bundledPetPrefix: "内置宠物：",
    bundledPetSuffix: "（来自原版 OpenPet Nia 资源）",
    linksTitle: "项目链接",
    githubLabel: "GitHub",
    githubUrl: "https://github.com/X-T-E-R/Petsidian",
    supportLabel: "请我喝奶茶",
    supportUrl: "https://afdian.com/a/xter123",
    friendLinksTitle: "友情链接",
    friendLinks: [
      {
        label: "OpenPet",
        href: "https://github.com/X-T-E-R/OpenPet"
      },
      {
        label: "Petdex",
        href: "https://petdex.crafter.run/"
      },
      {
        label: "Codex Pets",
        href: "https://codex-pets.net/"
      }
    ]
  }
} as const satisfies SettingsUiStrings;

const PET_ACTION_LABELS_BY_LANGUAGE: Record<
  PetLanguage,
  Record<PetActionAnimationId, string>
> = {
  en: {
    waving: "Wave",
    jumping: "Jump",
    waiting: "Wait",
    running: "Run in place",
    review: "Review",
    failed: "Fail"
  },
  "zh-CN": {
    waving: "挥手",
    jumping: "跳跃",
    waiting: "等待",
    running: "原地跑",
    review: "检查",
    failed: "失败"
  }
};

const COMPANION_EVENT_LABELS_BY_LANGUAGE: Record<
  PetLanguage,
  Record<CompanionEventType, string>
> = {
  en: {
    thinking: "Thinking",
    "tool-running": "Tool running",
    reviewing: "Reviewing",
    success: "Success",
    failure: "Failure",
    attention: "Attention"
  },
  "zh-CN": {
    thinking: "思考中",
    "tool-running": "工具运行中",
    reviewing: "检查中",
    success: "成功",
    failure: "失败",
    attention: "请注意"
  }
};

const NATIVE_SIGNAL_UI_BY_LANGUAGE: Record<
  PetLanguage,
  Record<NativeObsidianSignalKey, { label: string; description: string }>
> = {
  en: {
    "file-open": {
      label: "File open",
      description: "React when the active note or canvas file changes."
    },
    "vault-create": {
      label: "Vault create",
      description: "React when a new file appears after the vault layout is ready."
    },
    "vault-modify": {
      label: "Vault modify",
      description: "React to saved file changes. This is noisier than file-open or create."
    },
    "vault-rename": {
      label: "Vault rename",
      description: "React when a file is renamed or moved."
    },
    "vault-delete": {
      label: "Vault delete",
      description: "React when a file is removed from the vault."
    },
    "metadata-changed": {
      label: "Metadata changed",
      description: "React when Obsidian finishes indexing a file's metadata cache."
    },
    "metadata-resolved": {
      label: "Metadata resolved",
      description: "React when link resolution finishes after metadata updates."
    },
    "editor-activity": {
      label: "Editor activity",
      description: "React to typing or editing in the active Markdown editor."
    }
  },
  "zh-CN": {
    "file-open": {
      label: "打开文件",
      description: "当当前笔记或 Canvas 文件变化时触发。"
    },
    "vault-create": {
      label: "新增文件",
      description: "在仓库布局准备完成后，有新文件出现时触发。"
    },
    "vault-modify": {
      label: "修改文件",
      description: "对已保存的文件变更做出反应。它比打开文件或新增文件更容易频繁触发。"
    },
    "vault-rename": {
      label: "重命名文件",
      description: "当文件被重命名或移动时触发。"
    },
    "vault-delete": {
      label: "删除文件",
      description: "当文件从仓库中移除时触发。"
    },
    "metadata-changed": {
      label: "元数据已变化",
      description: "当 Obsidian 完成某个文件的元数据缓存索引时触发。"
    },
    "metadata-resolved": {
      label: "元数据已解析",
      description: "当元数据更新后的链接解析完成时触发。"
    },
    "editor-activity": {
      label: "编辑器活动",
      description: "对当前 Markdown 编辑器中的输入或编辑做出反应。"
    }
  }
};

const BUBBLE_STYLE_LABELS_BY_LANGUAGE: Record<
  PetLanguage,
  Record<BubbleStyle, string>
> = {
  en: {
    soft: "Soft",
    comic: "Comic",
    glass: "Glass",
    terminal: "Terminal"
  },
  "zh-CN": {
    soft: "柔和",
    comic: "漫画",
    glass: "玻璃",
    terminal: "终端"
  }
};

const SETTINGS_UI_STRINGS_BY_LANGUAGE: Record<PetLanguage, SettingsUiStrings> = {
  en: EN_SETTINGS_UI,
  "zh-CN": ZH_SETTINGS_UI
};

export function getPetUiStrings(language: PetLanguage): PetUiStrings {
  return PET_UI_STRINGS_BY_LANGUAGE[language] ?? PET_UI_STRINGS_BY_LANGUAGE.en;
}

export function getSettingsUiStrings(language: PetLanguage): SettingsUiStrings {
  return SETTINGS_UI_STRINGS_BY_LANGUAGE[language] ?? SETTINGS_UI_STRINGS_BY_LANGUAGE.en;
}

export function getSettingsSections(
  language: PetLanguage
): readonly { id: SettingsSectionId; label: string; description: string }[] {
  const strings = getSettingsUiStrings(language);
  return SETTINGS_SECTION_IDS.map((id) => ({
    id,
    label: strings.sections[id].label,
    description: strings.sections[id].description
  }));
}

export function getLocalizedPetActionLabel(
  language: PetLanguage,
  action: PetActionAnimationId
): string {
  return PET_ACTION_LABELS_BY_LANGUAGE[language]?.[action] ?? PET_ACTION_LABELS_BY_LANGUAGE.en[action];
}

export function getLocalizedCompanionEventLabel(
  language: PetLanguage,
  eventType: CompanionEventType
): string {
  return (
    COMPANION_EVENT_LABELS_BY_LANGUAGE[language]?.[eventType] ??
    COMPANION_EVENT_LABELS_BY_LANGUAGE.en[eventType]
  );
}

export function getLocalizedCompanionEventBubble(
  language: PetLanguage,
  eventType: CompanionEventType
): string {
  if (language === "zh-CN") {
    switch (eventType) {
      case "thinking":
        return "思考中……";
      case "tool-running":
        return "正在运行工具……";
      case "reviewing":
        return "正在检查变更……";
      case "success":
        return "完成啦！";
      case "failure":
        return "有些地方需要注意。";
      case "attention":
        return "看这里。";
    }
  }

  switch (eventType) {
    case "thinking":
      return "Thinking...";
    case "tool-running":
      return "Running a tool...";
    case "reviewing":
      return "Reviewing changes...";
    case "success":
      return "Done!";
    case "failure":
      return "Something needs attention.";
    case "attention":
      return "Need your attention.";
  }
}

export function getLocalizedNativeEventBubble(
  language: PetLanguage,
  signal: NativeObsidianSignalKey,
  label?: string | null
): string {
  const safeLabel = label?.trim();
  if (language === "zh-CN") {
    switch (signal) {
      case "file-open":
        return safeLabel ? `已打开 ${safeLabel}。` : "已打开文件。";
      case "vault-create":
        return safeLabel ? `已创建 ${safeLabel}。` : "已创建文件。";
      case "vault-modify":
        return safeLabel ? `已保存 ${safeLabel}。` : "已保存文件。";
      case "vault-rename":
        return safeLabel ? `已重命名 ${safeLabel}。` : "已重命名文件。";
      case "vault-delete":
        return safeLabel ? `已移除 ${safeLabel}。` : "已移除文件。";
      case "metadata-changed":
        return safeLabel ? `已索引 ${safeLabel}。` : "已更新元数据索引。";
      case "metadata-resolved":
        return "链接已解析。";
      case "editor-activity":
        return safeLabel ? `正在编辑 ${safeLabel}。` : "正在编辑。";
    }
  }

  switch (signal) {
    case "file-open":
      return safeLabel ? `Opened ${safeLabel}.` : "Opened a file.";
    case "vault-create":
      return safeLabel ? `Created ${safeLabel}.` : "Created a file.";
    case "vault-modify":
      return safeLabel ? `Saved ${safeLabel}.` : "Saved a file.";
    case "vault-rename":
      return safeLabel ? `Renamed ${safeLabel}.` : "Renamed a file.";
    case "vault-delete":
      return safeLabel ? `Removed ${safeLabel}.` : "Removed a file.";
    case "metadata-changed":
      return safeLabel ? `Indexed ${safeLabel}.` : "Metadata indexed.";
    case "metadata-resolved":
      return "Links resolved.";
    case "editor-activity":
      return safeLabel ? `Writing in ${safeLabel}.` : "Editing.";
  }
}

export function getLocalizedNotice(
  language: PetLanguage,
  notice:
    | "pet-shown"
    | "pet-hidden"
    | "dialog-unavailable"
    | "dialog-open-failed"
    | "import-removed"
): string {
  if (language === "zh-CN") {
    switch (notice) {
      case "pet-shown":
        return "Petsidian 宠物已显示。";
      case "pet-hidden":
        return "Petsidian 宠物已隐藏。";
      case "dialog-unavailable":
        return "当前 Obsidian 构建不支持 Electron 文件选择对话框。";
      case "dialog-open-failed":
        return "Petsidian 无法打开本地宠物导入对话框。";
      case "import-removed":
        return "已移除导入宠物。";
    }
  }

  switch (notice) {
    case "pet-shown":
      return "Petsidian pet shown.";
    case "pet-hidden":
      return "Petsidian pet hidden.";
    case "dialog-unavailable":
      return "Electron file dialogs are not available in this Obsidian build.";
    case "dialog-open-failed":
      return "Petsidian could not open the local pet import dialog.";
    case "import-removed":
      return "Imported pet removed.";
  }
}

export function getLocalizedImportedNotice(
  language: PetLanguage,
  displayName: string
): string {
  return language === "zh-CN"
    ? `已导入 ${displayName}。`
    : `Imported ${displayName}.`;
}

export function getLocalizedNativeSignalUi(
  language: PetLanguage,
  signal: NativeObsidianSignalKey
): { label: string; description: string } {
  return NATIVE_SIGNAL_UI_BY_LANGUAGE[language]?.[signal] ?? NATIVE_SIGNAL_UI_BY_LANGUAGE.en[signal];
}

export function getLocalizedBubbleStyleLabel(
  language: PetLanguage,
  style: BubbleStyle
): string {
  return BUBBLE_STYLE_LABELS_BY_LANGUAGE[language]?.[style] ?? BUBBLE_STYLE_LABELS_BY_LANGUAGE.en[style];
}
