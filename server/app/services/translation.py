from deep_translator import GoogleTranslator

class TranslationService:
    def translate_to_korean(self, text: str) -> str:
        if not text:
            return ""
        try:
            return GoogleTranslator(source='auto', target='ko').translate(text)
        except Exception as e:
            print(f"번역 실패: {e}")
            return f"(번역 실패) {text}"