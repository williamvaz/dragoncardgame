import os
from PIL import Image

# Lista as imagens com extensões suportadas (pode adicionar outras)
extensoes_suportadas = (".jpg", ".jpeg", ".png")

# Loop pelas imagens na pasta atual
for arquivo in os.listdir("."):
    # Verifica se a extensão é suportada e se não é o próprio script
    if arquivo.lower().endswith(extensoes_suportadas) and arquivo != "converte_webp.py":
        # Monta o caminho completo da imagem de entrada
        caminho_entrada = os.path.join(".", arquivo)

        # Monta o caminho completo da imagem de saída (.webp)
        nome_arquivo_webp = os.path.splitext(arquivo)[0] + ".webp"
        caminho_saida = os.path.join(".", nome_arquivo_webp)

        # Tenta abrir, converter e salvar a imagem
        try:
            with Image.open(caminho_entrada) as img:
                img.save(caminho_saida, "webp")
                print(f"Imagem '{arquivo}' convertida para '{nome_arquivo_webp}'")
        except Exception as e:
            print(f"Erro ao converter '{arquivo}': {e}")

print("Conversão concluída!")