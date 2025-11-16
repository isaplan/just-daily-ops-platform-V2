# Next.js App Router Development Patterns

## Directory Structure (`app/`)

- **Routing:** Use folder-based routing. `page.tsx` defines UI, `layout.tsx` defines shared UI, `loading.tsx` for loading states, `error.tsx` for error boundaries.
- **Route Groups:** Use `(groupName)` folders to organize routes without affecting the URL path (e.g., `(marketing)/about/page.tsx`).
- **Private Folders:** Prefix folder names with `_` (e.g., `_components`) to prevent them from being included in routing.

## Component Types

- **Server Components (Default):** Use for components that fetch data server-side, access backend resources directly, or don't require interactivity/state. Keep sensitive logic here.
- **Client Components:** Use `'use client';` directive at the top for components requiring state (`useState`, `useReducer`), lifecycle effects (`useEffect`), browser APIs, or event listeners. Keep client bundles small. Interleave Client Components within Server Components where needed.

## Data Fetching

- **Server Components:** Use `async/await` directly within Server Components. Leverage React Server Components caching. Fetch data in `layout.tsx`, `page.tsx`, or dedicated Server Components. Use `fetch` with Next.js extended options for caching/revalidation.
- **Client Components:** Fetch data client-side using libraries like SWR or React Query, or within `useEffect`. Alternatively, pass data fetched in Server Components down as props.
- **Server Actions:** Use for form submissions and data mutations. Define actions within Server Components or in separate files (`'use server';`). Bind actions to forms or call them from Client Components.

## Caching & Revalidation

- Utilize Next.js fetch caching (`cache: 'force-cache'`, `cache: 'no-store'`) and revalidation options (`next: { revalidate: seconds }`).
- Use `revalidatePath` and `revalidateTag` within Server Actions or API routes to invalidate cached data on demand.

## Examples

```typescript
// app/users/[id]/page.tsx (Server Component)
async function getUserData(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const userData = await getUserData(params.id);

  return (
    <div>
      <h1>{userData.name}</h1>
      {/* Pass data to Client Components if needed */}
      {/* <InteractiveUserActions user={userData} /> */}
    </div>
  );
}
```

## Attached References

- `@nextjs-auth-setup.md`
- `@api-routes-guide.ts`
