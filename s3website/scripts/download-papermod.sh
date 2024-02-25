cd ./tmp
curl -L -o papermod.zip "https://github.com/adityatelange/hugo-PaperMod/archive/master.zip"
cd ../web/themes
mkdir PaperMod
rm -rf PaperMod/*
cd PaperMod
tar -xzvf ../../../tmp/papermod.zip  --strip-components=1