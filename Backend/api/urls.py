from django.urls import path
from . import views

urlpatterns = [
    path("entities/", views.EntitySearchAPIView.as_view(), name="entity-search"),
    path("entities/<str:entity_id>/", views.ProfileDetailAPIView.as_view(), name="entity-detail"),
    path("entities/<str:entity_id>/timeline/", views.TimelineAPIView.as_view(), name="entity-timeline"),
    # path("")
    # path("entities/<str:entity_id>/predict_location/", views.PredictLocationAPIView.as_view(), name="predict-location"),
    path("alerts/", views.AlertsListAPIView.as_view(), name="alerts-list"),
]