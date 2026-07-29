import { createApiClient } from '@/services/http'

const usersApi = createApiClient()


export const getUsers = async () => {
    const response = await usersApi.get('/users/list')

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const createUser = async ({
    name,
    email,
    password,
    phone_number
}) => {
    const body = new URLSearchParams()
    body.append('name', name)
    body.append('email', email)
    body.append('password', password)
    body.append('phone_number', phone_number)
    const response = await usersApi.post(`/users/create`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const updateUser = async ({
    user_id,
    name,
    email,
    phone_number
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('name', name)
    body.append('email', email)
    body.append('phone_number', phone_number)
    const response = await usersApi.put(`/users/update/${user_id}`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const deleteUser = async ({
    user_id
}) => {
    const response = await usersApi.delete(`/users/delete/${user_id}`, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}