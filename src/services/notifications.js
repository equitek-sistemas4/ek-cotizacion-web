import { createApiClient } from '@/services/http'

const notificationsApi = createApiClient()

const getAuthorizationConfig = (accessToken) => {
    if (!accessToken) {
        return {}
    }

    return {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    }
}


export const getUnreadNotifications = async (user_id) => {
    const response = await notificationsApi.get(`/notifications/unread/${user_id}`)

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const createNotification = async ({
    user_id,
    section,
    chat_id,
    accessToken,
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('section', section)
    if (chat_id !== undefined && chat_id !== null) {
        body.append('chat_id', chat_id)
    }
    const authorizationConfig = getAuthorizationConfig(accessToken)
    const response = await notificationsApi.post(`/notifications/create`, body, {
        ...authorizationConfig,
        headers: {
            ...authorizationConfig.headers,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const readNotifications = async ({
    user_id,
    section,
    chat_id,
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('section', section)
    if (chat_id !== undefined && chat_id !== null) {
        body.append('chat_id', chat_id)
    }
    const response = await notificationsApi.post(`/notifications/read`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}
