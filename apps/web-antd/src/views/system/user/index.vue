<script lang="ts" setup>
import { ref } from 'vue';
import { Card, Table, Button, Space, Input, Form } from 'ant-design-vue';

// 定义页面标题
defineOptions({
  name: 'UserManagement',
});

// 示例数据
const dataSource = ref([
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    role: '管理员',
    status: '启用',
    createTime: '2024-01-01',
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    role: '普通用户',
    status: '启用',
    createTime: '2024-01-02',
  },
]);

// 表格列定义
const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
  },
];

// 搜索表单
const searchForm = ref({
  name: '',
  email: '',
});

// 搜索功能
const handleSearch = () => {
  console.log('搜索条件:', searchForm.value);
  // 这里可以调用API进行搜索
};

// 重置搜索
const handleReset = () => {
  searchForm.value = {
    name: '',
    email: '',
  };
};

// 新增用户
const handleAdd = () => {
  console.log('新增用户');
  // 这里可以打开新增用户的弹窗或跳转到新增页面
};

// 编辑用户
const handleEdit = (record: any) => {
  console.log('编辑用户:', record);
  // 这里可以打开编辑用户的弹窗或跳转到编辑页面
};

// 删除用户
const handleDelete = (record: any) => {
  console.log('删除用户:', record);
  // 这里可以调用删除API
};
</script>

<template>
  <div class="p-4">
    <!-- 页面标题 -->
    <div class="mb-4">
      <h1 class="text-2xl font-bold">用户管理</h1>
      <p class="text-gray-600">管理系统用户信息</p>
    </div>

    <!-- 搜索表单 -->
    <Card class="mb-4">
      <Form layout="inline" :model="searchForm">
        <Form.Item label="姓名">
          <Input v-model:value="searchForm.name" placeholder="请输入姓名" />
        </Form.Item>
        <Form.Item label="邮箱">
          <Input v-model:value="searchForm.email" placeholder="请输入邮箱" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" @click="handleSearch">搜索</Button>
            <Button @click="handleReset">重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>

    <!-- 操作按钮 -->
    <div class="mb-4">
      <Button type="primary" @click="handleAdd">新增用户</Button>
    </div>

    <!-- 数据表格 -->
    <Card>
      <Table
        :dataSource="dataSource" 
        :columns="columns" 
        :pagination="{ pageSize: 10 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">
                编辑
              </Button>
              <Button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>

<style scoped>
/* 可以添加页面特定的样式 */
</style>
