"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Category, CategoryInsert } from "@/lib/types/produtos";

// ============================================
// LISTAR CATEGORIAS DA LOJA
// ============================================
export async function listCategories(): Promise<{
  data: Category[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .eq("status", "ativo")
    .order("nome", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as Category[]) || [], error: null };
}

// ============================================
// CRIAR CATEGORIA RÁPIDA
// ============================================
export async function createCategory(input: CategoryInsert): Promise<{
  data: Category | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id")
    .eq("id", user!.id)
    .single();

  if (!profile) {
    return { data: null, error: "Perfil não encontrado." };
  }

  // Check if category already exists
  const { data: existing } = await supabase
    .from("categorias")
    .select("id")
    .eq("loja_id", profile.loja_id)
    .ilike("nome", input.nome.trim())
    .maybeSingle();

  if (existing) {
    return { data: null, error: "Essa categoria já existe." };
  }

  const { data, error } = await supabase
    .from("categorias")
    .insert({
      loja_id: profile.loja_id,
      nome: input.nome.trim(),
      status: "ativo",
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/dashboard/produtos");
  return { data: data as Category, error: null };
}

// ============================================
// ATUALIZAR CATEGORIA
// ============================================
export async function updateCategory(
  id: string,
  input: Partial<CategoryInsert & { status: string }>
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {};
  if (input.nome) updatePayload.nome = input.nome.trim();
  if (input.status) updatePayload.status = input.status;

  const { error } = await supabase
    .from("categorias")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/produtos");
  return { error: null };
}

// ============================================
// EXCLUIR CATEGORIA
// ============================================
export async function deleteCategory(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Check if any products use this category
  const { count } = await supabase
    .from("produtos")
    .select("*", { count: "exact", head: true })
    .eq("categoria_id", id)
    .is("deleted_at", null);

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} produto(s) usam esta categoria.`,
    };
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/produtos");
  return { error: null };
}
