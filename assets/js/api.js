/** Thin JSON client for the Symfony API (src/Controller/Api/BookingApiController.php). */

async function request(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    if (!res.ok) {
        const error = new Error(data?.error || `Request failed (${res.status})`);
        error.status = res.status;
        error.errors = data?.errors || {};
        throw error;
    }
    return data;
}

export const api = {
    calendar: () => request('GET', '/api/calendar'),
    availability: ({ barber, service, date }) => request('GET', `/api/availability?${new URLSearchParams({ barber, service, date })}`),
    nextFree: (barber) => request('GET', `/api/next-free${barber ? `?barber=${encodeURIComponent(barber)}` : ''}`),
    nextFreeAll: () => request('GET', '/api/next-free?scope=all'),
    book: (payload) => request('POST', '/api/bookings', payload),
    gift: (payload) => request('POST', '/api/gift-cards', payload),
};
