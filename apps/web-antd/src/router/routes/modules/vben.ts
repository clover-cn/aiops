import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'VbenAbout',
    path: '/vben-admin/about',
    component: () => import('#/views/_core/about/index.vue'),
    meta: {
      badgeType: 'dot',
      icon: 'lucide:copyright',
      title: $t('demos.vben.about'),
      order: 9999,
    },
  },
];

export default routes;
