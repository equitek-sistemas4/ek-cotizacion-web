import { createApiClient } from '@/services/http'

const rolesApi = createApiClient()


export const getRoles = async () => {
    const response = await rolesApi.get('/roles/list')

    return Array.isArray(response.data?.data) ? response.data.data : []
}

export const getPermissions = async () => {
    const response = await rolesApi.get('/roles/permissions/list')

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const createRole = async ({
    name,
    description
}) => {
    const body = new URLSearchParams()
    body.append('name', name)
    body.append('description', description)
    const response = await rolesApi.post(`/roles/create`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const addPermissionsToRole = async ({
    role_id,
    permission_ids = [],
    permission_id,
}) => {
    const body = new URLSearchParams()
    body.append('role_id', role_id)

    if (permission_id) {
        body.append('permission_id', permission_id)
    }

    permission_ids.forEach((id) => {
        body.append('permission_ids', id)
    })

    const response = await rolesApi.post('/roles/permissions/create', body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const getRolePermissions = async ({ role_id }) => {
    const response = await rolesApi.get(`/roles/${role_id}/permissions`)

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const deleteRolePermission = async ({ role_permission_id }) => {
    const response = await rolesApi.delete(`/roles/permissions/${role_permission_id}`)

    return response.data?.data ?? response.data
}
