import os
import subprocess
from pathlib import Path

# CONFIGURACOES
SERVER = "victoradm@194.242.56.151"
TARGET_DIR = "/opt/sites/flow/"
LOCAL_ROOT = Path(r"D:\_DEVELOP\SITE\GITHUB\flowcom")
KEY_PATH = r"C:\Users\vlpin\.ssh\id_ed25519"
FOLDERS_TO_SYNC = ["src", "public"]
ARCHIVE_NAME = "flow_sync.tar.gz"

def run_command(cmd):
    try:
        # shell=True é necessário no Windows para encontrar os binários do git bash / openssh
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def main():
    print("=" * 60)
    print(" 🚀 SINCRONIZAÇÃO PREMIUM: MODO EMPACOTADO")
    print("=" * 60)

    # 1. Criar o pacote localmente usando o tar do Git Bash (que já está no PATH)
    print(f"\n📦 Empacotando arquivos: {FOLDERS_TO_SYNC}...")

    # Comando tar: -c (create), -z (gzip), -f (file)
    # Nós mudamos para o diretório raiz para que os caminhos dentro do tar sejam relativos
    tar_cmd = f'tar -czf "{ARCHIVE_NAME}" -C "{LOCAL_ROOT}" {" ".join(FOLDERS_TO_SYNC)}'

    ret, out, err = run_command(tar_cmd)
    if ret != 0:
        print(f"❌ Erro ao empacotar: {err}")
        return

    print("✅ Pacote criado com sucesso!")

    # 2. Enviar o único arquivo compactado para o servidor
    print(f"\n📤 Enviando {ARCHIVE_NAME} para o servidor...")

    # Usamos -i para a chave privada. Pedirá senha APENAS UMA VEZ se a chave tiver passphrase.
    scp_cmd = f'scp -i "{KEY_PATH}" "{ARCHIVE_NAME}" {SERVER}:{TARGET_DIR}'

    ret, out, err = run_command(scp_cmd)
    if ret != 0:
        print(f"❌ Erro no envio: {err}")
        # Limpar o arquivo local antes de sair
        if os.path.exists(ARCHIVE_NAME): os.remove(ARCHIVE_NAME)
        return
    print("✅ Arquivo enviado com sucesso!")

    # 3. Descompactar no servidor e remover o arquivo .tar.gz
    print("\n🛠️ Extraindo arquivos no servidor...")

    # Comando remoto: entra na pasta, descompacta e apaga o pacote
    # -x: extract, -z: gzip, -f: file, -C: destination directory
    remote_cmd = f'tar -xzf {TARGET_DIR}{ARCHIVE_NAME} -C {TARGET_DIR} && rm {TARGET_DIR}{ARCHIVE_NAME}'
    ssh_cmd = f'ssh -i "{KEY_PATH}" {SERVER} "{remote_cmd}"'

    ret, out, err = run_command(ssh_cmd)
    if ret != 0:
        print(f"❌ Erro na extração: {err}")
    else:
        print("✅ Arquivos extraídos e sincronizados!")

    # 4. Limpeza local
    if os.path.exists(ARCHIVE_NAME):
        os.remove(ARCHIVE_NAME)

    print("\n" + "=" * 60)
    print(" ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!")
    print(" Agora você pode rodar o './deploy.sh' no servidor.")
    print("=" * 60)

if __name__ == "__main__":
    main()
