from django.contrib import admin

from core.models import AnalysisJob, Category, Document

admin.site.register(Category)
admin.site.register(Document)
admin.site.register(AnalysisJob)
