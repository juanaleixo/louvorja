import { ref } from "vue"

export const isTokenInvalid = ref(false)

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401) {
    isTokenInvalid.value = true
    throw new Error("Token inválido")
  }
  return res
}
