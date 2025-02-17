# Análisis estático de APK

<p>Este proyecto corresponde a la primera implementación del análisis estático de APK basada en la herramienta MBSF</p>
<p>El tratamiento actual se limita a los archivos .apk</p>


# Uso
```
sudo apt update && sudo apt upgrade -y
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.10
sudo apt-get install python3.10-dev
sudo apt install python3.10-venv
sudo apt-get install build-essential
sudo apt-get install git
sudo apt install python3-tk
sudo apt install python3-pip
pip install --upgrade pip
sudo apt-get install libpoppler-cpp-dev

git clone http://185.179.105.169:8929/analisisapp/safemountain/modules/mobsf.git

cd mobsf
python3.10 -m venv cmobsf_env
source mobsf_env/bin/activate
pip install -r requirements.txt

python3 main.py [--source=<source apk path>] [--result=<result directory path>]
```

Para obtener la ayuda sobre estos parámetros de ejecución:
```
python3 main.py -h
``` 
La documentación está disponible en http://185.179.105.169:8966/8de5c72ad78815205402c07b3fc69f14/analisisapp/docs/category/mobsf

