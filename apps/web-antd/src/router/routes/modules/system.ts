import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 1000,
      title: $t('page.system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'UserManagement',
        path: '/user',
        component: () => import('#/views/system/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.system.user'),
        },
      },
      // 可以继续添加其他系统管理页面
      // {
      //   name: 'RoleManagement',
      //   path: '/role',
      //   component: () => import('#/views/system/role/index.vue'),
      //   meta: {
      //     icon: 'lucide:user-check',
      //     title: $t('page.system.role'),
      //   },
      // },
    ],
  },
];

export default routes;
