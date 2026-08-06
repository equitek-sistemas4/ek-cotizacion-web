import { createApiClient } from '@/services/http'

const notificationsApi = createApiClient()


export const getUnreadNotifications = async (user_id) => {
    const response = await notificationsApi.get(`/notifications/unread/${user_id}`)

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const createNotification = async ({
    user_id,
    section,
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('section', section)
    const response = await notificationsApi.post(`/notifications/create`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const readNotifications = async ({
    user_id,
    section,
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('section', section)
    const response = await notificationsApi.post(`/notifications/read`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}
