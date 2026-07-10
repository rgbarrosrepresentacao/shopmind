"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================
// UPLOAD DE IMAGEM DO PRODUTO
// ============================================
export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { url: null, error: "Nenhum arquivo selecionado." };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { url: null, error: "Formato inválido. Use JPEG, PNG ou WebP." };
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { url: null, error: "Imagem muito grande. Máximo 2MB." };
  }

  // Get loja_id
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("usuarios")
    .select("loja_id")
    .eq("id", user!.id)
    .single();

  if (!profile) {
    return { url: null, error: "Perfil não encontrado." };
  }

  // Build path: {loja_id}/{product_id}/{timestamp}.{ext}
  const ext = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const filePath = `${profile.loja_id}/${productId}/${timestamp}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("produtos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("produtos").getPublicUrl(filePath);

  // Update product foto_url
  await supabase
    .from("produtos")
    .update({ foto_url: publicUrl })
    .eq("id", productId);

  return { url: publicUrl, error: null };
}

// ============================================
// DELETAR IMAGEM DO PRODUTO
// ============================================
export async function deleteProductImage(
  productId: string,
  imageUrl: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Extract file path from the full URL
  const bucketUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/produtos/";
  const filePath = imageUrl.replace(bucketUrl, "");

  if (!filePath) {
    return { error: "Caminho do arquivo inválido." };
  }

  const { error: deleteError } = await supabase.storage
    .from("produtos")
    .remove([filePath]);

  if (deleteError) {
    return { error: deleteError.message };
  }

  // Clear foto_url on product
  await supabase
    .from("produtos")
    .update({ foto_url: null })
    .eq("id", productId);

  return { error: null };
}
