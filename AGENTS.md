<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use Lovable Cloud tables for signed-in sheets, campaigns, and NPCs with owner-scoped RLS; signed-out visitors use transient demo state so the experience is inspectable without an account.
- Keep RPG interaction logic in client-safe modules and never assume the public reference site's private authenticated data is available.
