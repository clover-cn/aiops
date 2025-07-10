import { ref, watch, onMounted, onUnmounted, readonly, type Ref } from 'vue';
import { usePreferences } from '@vben/preferences';

interface ThemeMonitorOptions {
  /**
   * 是否启用调试模式
   */
  debug?: boolean;
  /**
   * 主题变化时的回调函数
   */
  onThemeChange?: (isDark: boolean, theme: string) => void;
  /**
   * 是否启用DOM监听（用于监听非Vue管理的主题变化）
   */
  enableDOMWatch?: boolean;
}

interface ThemeMonitorReturn {
  /**
   * 当前是否为深色模式
   */
  isDark: Readonly<Ref<boolean>>;
  /**
   * 当前主题名称 ('dark' | 'light')
   */
  theme: Readonly<Ref<string>>;
  /**
   * 调试信息
   */
  debugInfo: Readonly<Ref<{
    updateCount: number;
    lastUpdate: string;
    htmlClasses: string;
    bodyClasses: string;
    detectedThemeSource: string;
  }>>;
  /**
   * 手动刷新主题检测
   */
  refreshTheme: () => void;
  /**
   * 打印调试信息到控制台
   */
  printDebugInfo: () => void;
}

/**
 * 主题监听Hook
 * 
 * 使用项目的主题管理系统来监听深色/浅色模式的变化
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useThemeMonitor } from '@/hooks/useThemeMonitor';
 * 
// 使用主题监听器，使用下划线前缀标记未使用变量,以避免 ESLint 报警告
const { isDark, theme, debugInfo, refreshTheme, printDebugInfo } = useThemeMonitor({
  debug: false,
  enableDOMWatch: false,
  onThemeChange: (isDark, theme) => {
    console.log('🎯 主题变化回调:', { isDark, theme, time: new Date().toLocaleTimeString() });
  }
});
 * </script>
 * 
 * <template>
 *   <div :class="{ 'dark-mode': isDark }">
 *     当前主题: {{ theme }}
 *   </div>
 * </template>
 * ```
 */
export function useThemeMonitor(options: ThemeMonitorOptions = {}): ThemeMonitorReturn {
  const {
    debug = false,
    onThemeChange,
    enableDOMWatch = false
  } = options;

  // 使用项目的主题管理系统
  const { isDark: vbenIsDark, theme: vbenTheme } = usePreferences();

  // 调试信息
  const debugInfo = ref({
    updateCount: 0,
    lastUpdate: '',
    htmlClasses: '',
    bodyClasses: '',
    detectedThemeSource: 'vben-preferences',
  });

  // DOM监听器
  let domObserver: MutationObserver | null = null;

  // 刷新主题检测
  const refreshTheme = () => {
    if (typeof document !== 'undefined') {
      debugInfo.value = {
        ...debugInfo.value,
        updateCount: debugInfo.value.updateCount + 1,
        lastUpdate: new Date().toLocaleTimeString(),
        htmlClasses: document.documentElement.className,
        bodyClasses: document.body.className,
      };
    }
  };

  // 打印调试信息
  const printDebugInfo = () => {
    if (!debug) return;

    console.group('🌓 主题监听器调试信息');
    console.log('📊 主题状态:', {
      当前主题: vbenTheme.value,
      深色模式: vbenIsDark.value ? '✅ 开启' : '❌ 关闭',
      检测来源: debugInfo.value.detectedThemeSource,
      更新次数: debugInfo.value.updateCount,
      最后更新: debugInfo.value.lastUpdate,
    });
    console.log('🔍 DOM状态:', {
      HTML类名: debugInfo.value.htmlClasses || '(无)',
      Body类名: debugInfo.value.bodyClasses || '(无)',
      'dark类存在': typeof document !== 'undefined' 
        ? document.documentElement.classList.contains('dark')
        : '未知',
    });
    console.log('⚙️ 配置信息:', {
      调试模式: debug,
      DOM监听: enableDOMWatch,
      变化回调: !!onThemeChange,
    });
    console.groupEnd();
  };

  // 监听项目主题变化
  watch(vbenIsDark, (isDark) => {
    refreshTheme();
    
    if (debug) {
      console.log('🔄 主题变化检测:', {
        新状态: isDark ? '深色模式' : '浅色模式',
        时间: new Date().toLocaleTimeString(),
      });
    }
    
    // 调用用户回调
    onThemeChange?.(isDark, vbenTheme.value);
    
    if (debug) {
      printDebugInfo();
    }
  }, { immediate: true });

  // DOM变化监听（可选）
  onMounted(() => {
    if (enableDOMWatch && typeof document !== 'undefined') {
      domObserver = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            shouldRefresh = true;
          }
        });
        
        if (shouldRefresh) {
          refreshTheme();
          if (debug) {
            console.log('🔍 DOM类名变化检测');
            printDebugInfo();
          }
        }
      });
      
      // 监听document.documentElement和document.body的class变化
      domObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      domObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      if (debug) {
        console.log('🎯 DOM监听器已启动');
      }
    }
    
    // 初始化
    refreshTheme();
    if (debug) {
      console.log('🚀 主题监听器已初始化');
      printDebugInfo();
    }
  });

  onUnmounted(() => {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
      if (debug) {
        console.log('🛑 DOM监听器已停止');
      }
    }
  });

  return {
    isDark: readonly(vbenIsDark),
    theme: readonly(vbenTheme),
    debugInfo: readonly(debugInfo),
    refreshTheme,
    printDebugInfo,
  };
}

// 类型导出
export type { ThemeMonitorOptions, ThemeMonitorReturn };