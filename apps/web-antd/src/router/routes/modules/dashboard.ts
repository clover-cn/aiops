import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

import { IFrameView } from '#/layouts';
const routes: RouteRecordRaw[] = [
  {
    meta: {
      badgeType: 'dot', // 徽标类型
      badgeVariants: 'green', // 徽标颜色
      icon: 'lucide:layout-dashboard',
      // activeIcon: 'fluent-emoji:radioactive', // 子菜单激活图标
      order: -1,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        name: 'Analytics',
        path: '/analytics',
        component: () => import('#/views/dashboard/analytics/index.vue'),
        meta: {
          affixTab: true,
          icon: 'lucide:area-chart',
          title: $t('page.dashboard.analytics'),
        },
      },
      {
        name: 'Workspace',
        path: '/workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          icon: 'carbon:workspace',
          title: $t('page.dashboard.workspace'),
        },
      },
      {
        name: 'AIOps',
        path: '/aiops',
        component: () => import('#/views/dashboard/aiops/index.vue'),
        // component: IFrameView, // 使用 IFrameView 组件，嵌入外部链接使用
        meta: {
          // activeIcon: 'fluent-emoji:radioactive', // 子菜单激活图标
          // link: 'https://baidu.com/', // 转跳外部链接
          // iframeSrc: 'https://tailwindcss.com/', // 内嵌链接
          // keepAlive: true, // 页面是否缓存
          badge: 'Hot', // 徽标文本
          badgeVariants: 'red', // 徽标颜色
          icon: 'lucide:monitor-speaker',
          title: $t('page.dashboard.aiops'),
        },
      },
    ],
  },
];

export default routes;
