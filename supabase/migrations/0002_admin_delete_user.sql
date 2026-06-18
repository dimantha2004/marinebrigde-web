-- Admin user deletion with full data cleanup.
-- SECURITY DEFINER so it runs with caller permissions (bypasses RLS).
-- Only admins should be granted EXECUTE on this function.

create or replace function admin_delete_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
begin
  -- 1. Orders where the user is captain / charter-party / ship-agent
  for oid in
    select id from orders
    where captain_id = p_target_user_id
       or charter_party_id = p_target_user_id
       or ship_agent_id = p_target_user_id
  loop
    delete from order_documents      where order_id = oid;
    delete from order_status_updates where order_line_item_id in (select id from order_line_items where order_id = oid);
    delete from order_line_items     where order_id = oid;
    delete from notifications        where order_id = oid;
    delete from messages             where order_id = oid;
    delete from orders               where id = oid;
  end loop;

  -- 2. Other records referencing the user directly
  delete from order_status_updates          where updated_by = p_target_user_id;
  delete from order_documents               where uploaded_by = p_target_user_id;
  delete from messages                      where sender_id = p_target_user_id or receiver_id = p_target_user_id;
  delete from notifications                 where recipient_id = p_target_user_id;
  delete from active_sessions               where user_id = p_target_user_id;
  delete from admin_password_resets         where requested_by = p_target_user_id or target_user_id = p_target_user_id;
  delete from supplier_service_mappings     where supplier_profile_id = p_target_user_id;

  -- 3. Profile row
  delete from profiles where id = p_target_user_id;

  -- 4. Auth user (different schema)
  delete from auth.users where id = p_target_user_id;
end;
$$;
